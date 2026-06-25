# 字体扩展设计文档

**日期：** 2026-06-25  
**背景：** 现有字体选择器仅提供 3 款像素字体 + 4 款系统字体，不支持用户自由添加字体。  
**目标：** 扩充内置字体库，新增中文字体分组，并允许用户输入任意字体名（含可用性检测与持久化保存）。

---

## 一、需求汇总

| 需求 | 说明 |
|---|---|
| 新增像素/科技风字体 | Orbitron、Share Tech Mono、Nova Mono、Audiowide（Google Fonts） |
| 新增中文字体（Google Fonts） | Noto Sans SC、Noto Serif SC |
| 新增中文系统字体 | 微软雅黑（Microsoft YaHei）、宋体（SimSun）、楷体（KaiTi） |
| 自定义字体输入 | 文本框 + 检测 + 警告 + 保存 |
| 持久化 | 自定义字体列表随配置文件导出/导入 |

---

## 二、数据模型变更

### `src/types/index.ts`

`LedConfig` 新增可选字段：

```ts
export type LedConfig = {
  version: '1.0'
  board: Board
  widgets: Widget[]
  customFonts?: string[]   // ← 新增
}
```

### `src/store/useLedStore.ts`

store 类型新增三个字段：

```ts
type LedStore = {
  // ... 现有字段 ...
  customFonts: string[]
  addCustomFont: (font: string) => void
  removeCustomFont: (font: string) => void
  // setConfig 扩展以接受 customFonts
  setConfig: (config: Pick<LedConfig, 'board' | 'widgets'> & { customFonts?: string[] }) => void
}
```

实现：

```ts
customFonts: [],

addCustomFont: (font) =>
  set((s) => ({
    customFonts: s.customFonts.includes(font) ? s.customFonts : [...s.customFonts, font],
  })),

removeCustomFont: (font) =>
  set((s) => ({ customFonts: s.customFonts.filter((f) => f !== font) })),

setConfig: ({ board, widgets, customFonts }) =>
  set({ board, widgets, customFonts: customFonts ?? [], selectedId: null }),
```

---

## 三、字体清单与加载

### `index.html` — Google Fonts `<link>` 替换为单条合并请求

```html
<link
  href="https://fonts.googleapis.com/css2?family=Press+Start+2P
    &family=Silkscreen:wght@400;700&family=VT323
    &family=Orbitron:wght@400;700&family=Share+Tech+Mono
    &family=Nova+Mono&family=Audiowide
    &family=Noto+Sans+SC:wght@400;700
    &family=Noto+Serif+SC:wght@400;700
    &display=swap"
  rel="stylesheet"
/>
```

### `src/components/FontSelector.tsx` — 字体常量

```ts
const PIXEL_FONTS = [
  'Press Start 2P', 'Silkscreen', 'VT323',
  'Orbitron', 'Share Tech Mono', 'Nova Mono', 'Audiowide',
]
const CHINESE_FONTS = [
  'Noto Sans SC', 'Noto Serif SC',
  'SimHei', 'Microsoft YaHei', 'SimSun', 'KaiTi',
]
// 删除原 SYSTEM_FONTS 常量
```

下拉框分组：

```
<optgroup label="像素字体">  7 款
<optgroup label="中文字体">  6 款（含原有 SimHei）
<optgroup label="自定义">    用户保存的字体（可为空）
```

---

## 四、自定义字体输入 UI

### 位置

`FontSelector` 组件下方追加输入区（`PropertyPanel` 渲染时，下拉框和自定义区连续显示）。

### 交互流程

```
用户在输入框输入字体名
→ 点击「+ 添加」或按 Enter
→ 调用 isFontAvailable(name)
  → true：直接 addCustomFont(name)，选中该字体，清空输入框
  → false：显示 ⚠ 警告文字，**不自动保存**
            用户再次点击「+ 添加」→ 强制保存（跳过检测）
```

### `isFontAvailable` 实现

```ts
function isFontAvailable(fontName: string): boolean {
  return document.fonts.check(`16px "${fontName}"`)
}
```

### 边界情况

| 场景 | 处理 |
|---|---|
| 输入为空或纯空格 | 「+ 添加」按钮禁用 |
| 字体名已在列表中 | 忽略，不重复添加 |
| 检测不可用 | 显示警告，二次点击强制添加 |
| 删除字体名 | 从 `customFonts` 移除；widget 已使用该字体名的不受影响 |

### 组件 Props

`FontSelector` 新增两个 props（可选，仅当父组件需要自定义字体管理时传入）：

```ts
type Props = {
  value: string
  onChange: (font: string) => void
  customFonts?: string[]
  onAddCustomFont?: (font: string) => void
  onRemoveCustomFont?: (font: string) => void
}
```

`PropertyPanel` 从 store 读取 `customFonts` / `addCustomFont` / `removeCustomFont` 后传入。

---

## 五、configIO 变更

### `serializeConfig` 签名扩展

```ts
export function serializeConfig(
  board: Board,
  widgets: Widget[],
  customFonts: string[] = []
): string {
  const config: LedConfig = { version: '1.0', board, widgets, customFonts }
  return JSON.stringify(config, null, 2)
}
```

### `exportConfig` 签名扩展

```ts
export function exportConfig(
  board: Board,
  widgets: Widget[],
  customFonts: string[] = []
): void
```

`ConfigPage.tsx` 更新调用：

```ts
const customFonts = useLedStore((s) => s.customFonts)
// ...
const handleExport = () => exportConfig(board, widgets, customFonts)

const handleImport = async (e) => {
  const config = await importConfig(file)
  if (config) {
    setConfig({ board: config.board, widgets: config.widgets, customFonts: config.customFonts })
  }
}
```

`parseConfig` 无需修改（已返回整个 `obj as LedConfig`，`customFonts` 字段自动透传）。

---

## 六、测试计划

### 现有测试：保持不变

现有 `useLedStore.test.ts` 和 `configIO.test.ts` 用例继续通过，无需修改。

### 新增用例

**`useLedStore.test.ts`**
- `addCustomFont` 添加一个新字体名
- `addCustomFont` 重复添加时列表不变（去重）
- `removeCustomFont` 删除存在的字体名
- `removeCustomFont` 删除不存在的字体名时安全（无报错）
- `setConfig` 传入 `customFonts` 时正确写回
- `setConfig` 不传 `customFonts` 时默认为空数组

**`configIO.test.ts`**
- `serializeConfig` 输出包含 `customFonts` 字段
- `serializeConfig` 不传 `customFonts` 时输出 `customFonts: []`
- `parseConfig` 解析含 `customFonts` 的 JSON 返回该字段
- `parseConfig` 解析不含 `customFonts` 的旧版 JSON 返回 `customFonts: undefined`（调用方用 `?? []` 兜底）

### 手动验收

- 新字体在下拉框中可选，canvas 渲染正确
- 输入已安装字体 → 无警告，自动选中并出现在「自定义」分组
- 输入未安装字体 → 显示警告；二次点击强制添加
- 导出 `.ledjson` 文件 → 包含 `customFonts` 数组
- 导入含自定义字体的配置 → 「自定义」分组还原

---

## 七、不在本次范围内

- Google Fonts API 动态搜索
- 字体预览（在下拉框内用对应字体渲染字体名）
- 字体文件本地上传
