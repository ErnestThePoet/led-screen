# LED 灯牌模拟器 · 设计文档

**日期**：2026-06-24  
**项目**：led-screen  
**状态**：已批准，待实现

---

## 概述

在浏览器中模拟真实 LED 点阵灯牌的显示效果。用户可通过配置页自由组合多种部件（日期时间、模拟时钟、滚动文字、自绘图案），调整点阵尺寸、颜色、字体等参数，导出配置文件分享给他人，在全屏展示页欣赏最终效果。

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| 路由 | React Router v6 |
| 状态管理 | Zustand |
| 拖拽 | react-draggable |
| 渲染 | Canvas 2D API |
| 字体 | Google Fonts（像素字体） + 系统字体 |
| 日期解析 | dayjs |
| 部署 | 可部署至 GitHub Pages 或任意静态托管 |

---

## 页面结构

```
/          展示页（DisplayPage）— 全屏 LED 效果
/config    配置页（ConfigPage）— 三栏布局
```

### 展示页（DisplayPage）

- 全黑背景，一个铺满视口的 `<canvas>` 持续以 `requestAnimationFrame` 渲染 LED 点阵
- 右上角固定一个半透明"⚙ 配置"按钮，点击跳转 `/config`
- 不显示任何其他 UI 元素，保持沉浸感

### 配置页（ConfigPage）

三栏布局：

```
┌─────────────┬───────────────────────┬────────────────┐
│  部件列表    │   Canvas 预览（缩放）   │  属性面板       │
│  + 新建部件  │   可拖拽部件到任意位置  │  选中部件的配置  │
│  部件1  👁   │                       │  颜色/字体/内容  │
│  部件2  👁   │                       │                │
│  ─────────  │                       │                │
│  全局设置    │   [导入]  [导出]       │                │
└─────────────┴───────────────────────┴────────────────┘
```

- 左栏：部件列表，支持添加/删除/显示隐藏/调整层级（zIndex）
- 中栏：Canvas 预览（与展示页共用渲染逻辑，等比缩放），叠加 HTML div 拖拽层
- 右栏：选中部件的属性表单；未选中时显示全局 Board 设置
- 底部：导入/导出 `.ledjson` 配置文件

---

## 数据模型

### Board（全局点阵配置）

```typescript
type Board = {
  width: number         // 点阵列数，默认 128
  height: number        // 点阵行数，默认 64
  dotSize: number       // 每个 LED 点的像素大小，默认 8
  dotGap: number        // 点间距（像素），默认 2
  renderMode: 'realistic' | 'clean'
  backgroundColor: string  // 默认 '#000000'
}
```

### Widget 基础类型

```typescript
type WidgetBase = {
  id: string            // uuid
  type: WidgetType
  x: number             // 左上角列坐标（单位：点）
  y: number             // 左上角行坐标（单位：点）
  width: number         // 宽度（单位：点）
  height: number        // 高度（单位：点）
  color: string         // 点亮时的颜色
  visible: boolean
  zIndex: number
}
```

### 四种部件扩展类型

```typescript
type DateTimeWidget = WidgetBase & {
  type: 'datetime'
  format: string         // dayjs 格式串，如 "YYYY-MM-DD HH:mm:ss"
  font: string
  fontSize: number       // 像素，作用于离屏 Canvas 的 ctx.font，用户在属性面板直接输入（建议范围 8–128px）
}

type ClockWidget = WidgetBase & {
  type: 'clock'
  showSecondHand: boolean
}

type ScrollTextWidget = WidgetBase & {
  type: 'scrolltext'
  items: string[]        // 轮播文本列表
  speed: number          // px/s，默认 60
  direction: 'left' | 'right' | 'up' | 'down'
  font: string
  fontSize: number       // 像素，同 DateTimeWidget.fontSize
  pauseMs: number        // 每条内容显示停顿时长（ms）
}

type PatternWidget = WidgetBase & {
  type: 'pattern'
  dots: boolean[][]      // [row][col]，true = 点亮
}

type Widget = DateTimeWidget | ClockWidget | ScrollTextWidget | PatternWidget
```

### 配置文件格式

```typescript
type LedConfig = {
  version: '1.0'
  board: Board
  widgets: Widget[]
}
```

文件扩展名：`.ledjson`，内容为 UTF-8 JSON。

---

## 渲染管线

### 总体流程（每帧）

```
requestAnimationFrame
  └─ 清空主 Canvas（backgroundColor）
  └─ 绘制全部暗点网格
  └─ 按 zIndex 排序遍历 visible widgets
       └─ 各部件 → OffscreenCanvas 光栅化
       └─ 像素采样 → 主 Canvas 逐点绘制 LED
  └─ 写实模式：额外 shadowBlur 发光叠加
```

### 步骤 1：部件光栅化

每个部件拥有一个与其点数尺寸等比的 `OffscreenCanvas`（尺寸 = `width * dotSize` × `height * dotSize`）：

| 部件类型 | 光栅化方式 |
|----------|-----------|
| DateTimeWidget | `dayjs().format(format)` → `ctx.fillText` |
| ClockWidget | `ctx.arc` / `ctx.lineTo` 绘制表盘、时针、分针、秒针 |
| ScrollTextWidget | `ctx.fillText` + 每帧偏移量（由 speed × Δt 累积） |
| PatternWidget | 直接读取 `dots[][]`，无需离屏 Canvas |

### 步骤 2：像素采样 → LED 点绘制

对每个部件覆盖范围内的点 `(col, row)`：

```
// 离屏 Canvas 紧凑排列（无 dotGap），只用 dotSize 采样
px = col * dotSize + dotSize/2
py = row * dotSize + dotSize/2
alpha = offscreenCtx.getImageData(px, py, 1, 1).data[3]

// 主 Canvas 上的实际屏幕坐标（包含 dotGap）
screenX = (widget.x + col) * (dotSize + dotGap)
screenY = (widget.y + row) * (dotSize + dotGap)

if alpha > 128:
  drawLitDot(mainCtx, screenX, screenY, dotRadius, widget.color)
else:
  drawDimDot(mainCtx, screenX, screenY, dotRadius)
```

### 写实模式（realistic）

- 点亮的 LED：`shadowBlur = dotSize * 1.5`，`shadowColor = widget.color`；填充使用径向渐变（中心白→边缘 color）
- 熄灭的 LED：深灰色（`#1a1a1a`），无 shadow

### 简洁模式（clean）

- 点亮：纯色圆形填充
- 熄灭：深灰色圆形填充，无任何 shadow

### 帧率策略

- ClockWidget、ScrollTextWidget：每帧重绘
- DateTimeWidget：每秒重绘一次（用时间戳变化检测）
- PatternWidget：仅初始化时绘制一次，配置变更时重绘

---

## 配置页交互细节

### 拖拽定位

配置页预览 Canvas 上方叠加透明 HTML div 层。每个部件对应一个 `react-draggable` 包裹的选框 div：
- 拖拽时：像素坐标除以缩放比 → 换算为点坐标 → 更新 Zustand store → Canvas 实时跟随
- 选中部件：右侧属性面板切换到该部件的表单

### 点阵编辑器（PatternWidget 专用）

属性面板中嵌入一个 HTML5 Canvas 网格（格数 = 部件 width × height）：
- 左键按下并拖动：点亮多格
- 右键按下并拖动：擦除多格
- "全部清除"按钮、"反转"按钮
- 导入图片：上传 → 绘制到同尺寸 OffscreenCanvas → 读取灰度 → 按阈值滑块（0–255）转换为 `dots[][]`

### 颜色选择器

1. 预设色板（8 色）：红 `#ff0000`、绿 `#00ff00`、蓝 `#0000ff`、黄 `#ffff00`、白 `#ffffff`、橙 `#ff8800`、青 `#00ffff`、紫 `#ff00ff`
2. 自定义：hex 输入框 + 原生 `<input type="color">`

### 字体列表

**像素字体**（Google Fonts，异步加载）：
- `Press Start 2P`
- `Silkscreen`
- `VT323`

**系统字体**：
- `Arial`
- `Georgia`
- `Courier New`
- `SimHei`（黑体，中文支持）

### 导入/导出

```
导出：
  JSON.stringify({ version: '1.0', board, widgets })
  → Blob → <a download="config.ledjson"> → 触发下载

导入：
  <input type="file" accept=".ledjson,.json">
  → FileReader.readAsText
  → JSON.parse
  → 结构校验（检查 version、board、widgets 字段）
  → 写入 Zustand store
```

---

## 目录结构（预期）

```
led-screen/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # 路由入口
│   ├── store/
│   │   └── useLedStore.ts         # Zustand store
│   ├── types/
│   │   └── index.ts               # Board、Widget 类型定义
│   ├── pages/
│   │   ├── DisplayPage.tsx
│   │   └── ConfigPage.tsx
│   ├── components/
│   │   ├── LedCanvas.tsx          # 主渲染 Canvas 组件
│   │   ├── DragLayer.tsx          # 配置页拖拽覆盖层
│   │   ├── WidgetList.tsx
│   │   ├── PropertyPanel.tsx
│   │   ├── PatternEditor.tsx      # 点阵编辑器
│   │   └── ColorPicker.tsx
│   ├── renderer/
│   │   ├── renderFrame.ts         # 主帧渲染逻辑
│   │   ├── rasterize/
│   │   │   ├── rasterizeDateTime.ts
│   │   │   ├── rasterizeClock.ts
│   │   │   ├── rasterizeScrollText.ts
│   │   │   └── rasterizePattern.ts
│   │   └── drawLedDot.ts          # 单点绘制（写实/简洁）
│   └── utils/
│       ├── configIO.ts            # 导入/导出逻辑
│       └── imageToPattern.ts      # 图片转点阵
├── docs/
│   └── superpowers/specs/
│       └── 2026-06-24-led-screen-design.md
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 约束与边界

- 点阵最大尺寸：256 × 128（超出此范围写实模式可能因 `shadowBlur` 导致帧率下降，建议切换 clean 模式）
- 配置文件版本：当前 `"1.0"`，结构不兼容时提示用户
- 不支持多用户实时协作（单机本地状态）
- 字体加载失败时降级为 `monospace`
