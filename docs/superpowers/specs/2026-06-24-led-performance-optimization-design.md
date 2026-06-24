# LED 点阵渲染性能优化设计

**日期：** 2026-06-24  
**背景：** 点阵设为 200×100（共 20,000 点）时，在 Windows 轻薄办公本上帧率较低、卡顿明显。  
**目标：** 尽力提升帧率，两种渲染模式（realistic / clean）均需优化，写实模式光晕效果近似即可。

---

## 一、瓶颈分析

经代码审查，确认以下四处主要瓶颈（按影响从大到小）：

| # | 位置 | 问题 | 影响 |
|---|---|---|---|
| 1 | `drawLedDot.ts:27` | `ctx.shadowBlur` 每个亮点单独设置/重置 | **最重大**，强制 GPU 对每个点执行 Gaussian 模糊合成 |
| 2 | `drawLedDot.ts:23` | `createRadialGradient` 每帧每个亮点创建一次 | 60fps × 最多 20,000 次/帧 = 大量 GC 压力 |
| 3 | `renderFrame.ts:68` | `beginPath + arc + fill` 每个亮点独立调用 | 每帧最多 20,000 次独立绘图调用 |
| 4 | 所有 rasterize 函数 | 每帧 `new OffscreenCanvas()`，包括静态 widget | pattern / clock 等静态内容被无意义重复光栅化 |

---

## 二、整体架构

### 新增模块

```
src/renderer/
├── drawLedDot.ts              现有，签名不变，内部用精灵图替代路径绘制
├── renderFrame.ts             现有，将 rasterizeWidget 替换为 getCachedRaster
├── dotSpriteCache.ts          ← 新增：LED 点精灵图缓存
└── rasterize/
    ├── rasterizeCache.ts      ← 新增：Widget 光栅化结果缓存
    ├── rasterizePattern.ts      现有，接口不变
    ├── rasterizeClock.ts        现有，接口不变
    ├── rasterizeScrollText.ts   现有，接口不变
    └── rasterizeDateTime.ts     现有，接口不变
```

### 每帧数据流

```
LedCanvas (RAF loop)
  └─► renderFrame()
        ├─ 背景（暗点）：批量路径一次 fill()        ← 现有，不变
        └─ 每个可见 Widget：
              ├─ getCachedRaster(widget, …)         ← 新：复用或按需重建 OffscreenCanvas
              └─ getImageData → 逐点采样
                    └─► drawLedDot(ctx, …)
                          └─► getDotSprite(color, size, mode)
                                └─► ctx.drawImage(sprite, x, y)  ← 替代 arc+fill+shadowBlur
```

### 关键不变量

- `renderFrame` 与 `drawLedDot` 对外签名**完全不变**，现有测试无需修改。
- `LedCanvas.tsx` **完全不改动**。
- 两个新模块各自独立，可单独测试。

---

## 三、精灵图缓存（`dotSpriteCache.ts`）

### 数据结构

```ts
// key 格式：`${dotSize}:${color}:${mode}`
const cache = new Map<string, ImageBitmap | 'pending'>()
```

### 精灵图规格

精灵图尺寸为 `dotSize × 3` 像素（含光晕扩散区，以便 drawImage 时覆盖周边区域）。

| 模式 | 精灵图内容 |
|---|---|
| `clean` | 纯色实心圆，无阴影，无渐变 |
| `realistic` | ① 半透明大圆（目标色 + 低 alpha，模拟环境光晕）<br>② 中心径向渐变实心圆（白→目标色→目标色半透明）<br>**不使用 `shadowBlur`** |

> **替代 shadowBlur 的方法：** 在精灵图里绘制一个半径为 `dotSize * 1.5` 的半透明圆作为光晕底层，再在中心绘制径向渐变圆。最终通过 `drawImage` 绘制精灵图时，光晕效果随点一起复合，完全无 GPU 合成开销。

### 对外接口

```ts
/**
 * 返回指定样式的 LED 亮点精灵图。
 * 首次调用时同步创建 OffscreenCanvas 并异步转为 ImageBitmap；
 * ImageBitmap 就绪前返回 null，调用方回退到原路径绘制。
 */
export function getDotSprite(
  color: string,
  dotSize: number,
  mode: RenderMode
): ImageBitmap | null

/**
 * board 的 dotSize 或 renderMode 变化时清空缓存，由 LedCanvas 的 useEffect 调用。
 */
export function clearDotSpriteCache(): void
```

### 冷启动回退

`ImageBitmap` 异步生成期间（通常仅第一帧），`drawLedDot` 回退到原有的 `arc + fill` 逻辑，功能不退化，仅该帧性能与改前相同。

### drawLedDot 内部变化

```ts
// 对外签名完全不变
export function drawLedDot(ctx, cx, cy, radius, color, lit, mode) {
  if (!lit) return  // 暗点已由批量路径处理，此分支不再被 renderFrame 调用

  const dotSize = radius * 2
  const sprite = getDotSprite(color, dotSize, mode)
  if (sprite) {
    // 快路径：一次 GPU 纹理采样，无路径、无阴影
    ctx.drawImage(sprite, cx - radius * 1.5, cy - radius * 1.5, dotSize * 3, dotSize * 3)
  } else {
    // 冷启动回退（仅首帧）
    fallbackDrawLit(ctx, cx, cy, radius, color, mode)
  }
}
```

---

## 四、Widget 光栅缓存（`rasterizeCache.ts`）

### 缓存策略

| Widget 类型 | 变化频率 | 策略 |
|---|---|---|
| `pattern` | 仅用户编辑时 | 永久缓存，`dots` 内容指纹变化时重建 |
| `datetime` | 每分钟或每秒（视格式） | 按实际渲染字符串失效，字符串不变则复用 |
| `clock` | 每秒（有秒针）/ 每分钟 | 按 `HH:MM:SS` / `HH:MM` 字符串失效 |
| `scrolltext` | 每帧（位置持续变化） | **不缓存**，每帧重新渲染 |

### 数据结构

```ts
type CacheEntry = {
  canvas: OffscreenCanvas
  key: string   // 内容指纹，用于判断是否需要重建
}

const widgetCache = new Map<string, CacheEntry>()  // Map key: widget.id
```

### 内容指纹（key）

- `pattern`：`JSON.stringify(widget.dots)`
- `datetime`：实际格式化后的显示字符串，如 `"2026-06-24 14:30"`
- `clock`：`"14:30:05"`（有秒针）或 `"14:30"`（无秒针）
- `scrolltext`：不适用

### 对外接口

```ts
/**
 * 替代 renderFrame 中的 rasterizeWidget()。
 * 对可缓存的 widget 类型复用上一帧的 OffscreenCanvas；
 * 对 scrolltext 直接透传到 rasterizeScrollText。
 */
export function getCachedRaster(
  widget: Widget,
  dotSize: number,
  scrollStates: Map<string, ScrollState>,
  deltaMs: number
): OffscreenCanvas | null

/**
 * widget 被删除时调用，防止 Map 无限增长。
 * 由 useLedStore 的删除 action 同步调用。
 */
export function evictWidgetCache(widgetId: string): void
```

### renderFrame 的唯一改动

```ts
// 改前
const offscreen = rasterizeWidget(widget, dotSize, scrollStates, deltaMs)

// 改后
const offscreen = getCachedRaster(widget, dotSize, scrollStates, deltaMs)
```

其余逻辑（`getImageData` → 逐点采样 → `drawLedDot`）完全不变。

---

## 五、错误处理

| 场景 | 处理方式 |
|---|---|
| `OffscreenCanvas` 不支持（旧浏览器） | 精灵图路径返回 null，永远走 fallback，功能不退化 |
| `createImageBitmap` 不支持 | 同上 |
| `board.dotSize` 或 `renderMode` 改变 | `LedCanvas` 现有 `useEffect` 依赖 `board`，触发时调用 `clearDotSpriteCache()` |
| widget 被删除 | store 删除 action 同步调用 `evictWidgetCache(id)` |
| `dotSize` 为 0 | `getDotSprite` 入口 guard，返回 null |

---

## 六、测试计划

### 现有测试

`drawLedDot.test.ts` 测试对外签名与行为，**保持不变且继续绿色**。

### 新增单元测试

**`dotSpriteCache.test.ts`**
- 同一 `(color, dotSize, mode)` 多次调用返回同一 `ImageBitmap` 实例（缓存命中）
- 不同 `color` 返回不同实例
- `clearDotSpriteCache()` 后重新生成新实例

**`rasterizeCache.test.ts`**
- `pattern`：相同 dots 返回相同 canvas 实例
- `pattern`：dots 内容变化后返回新 canvas 实例
- `clock`：同一秒内返回相同实例，跨秒后返回新实例
- `scrolltext`：每次调用返回新实例（无缓存）
- `evictWidgetCache()` 正确清理对应条目

### 集成验收（手动）

- 200×100、写实模式：Chrome DevTools Performance 面板帧率明显提升
- 写实模式光晕视觉效果与原版近似，无明显退化
- 切换至配置页再切回，显示页渲染正常
- 修改 widget 颜色/内容后，下一帧即刻反映变化（缓存正确失效）

---

## 七、不在本次范围内

- 帧率上限节流（用户期望"尽力而为"，不人为限速）
- 多线程渲染（OffscreenCanvas + Worker）
- WebGL 渲染后端
- 压缩 getImageData 采样（逐点采样逻辑不变）
