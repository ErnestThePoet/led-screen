# 字体扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩充内置字体库（像素 + 中文），并允许用户自由输入任意字体名、实时检测可用性，持久化保存至配置文件。

**Architecture:** 在 `LedConfig` 和 store 中新增 `customFonts: string[]`；`configIO` 的 `serializeConfig`/`exportConfig` 接受第三个 `customFonts` 参数；`FontSelector` 扩展为三组下拉 + 自定义输入区，`PropertyPanel` 从 store 读取 font 管理方法并传入。

**Tech Stack:** React 18, TypeScript strict, Zustand, Vitest

## Global Constraints

- TypeScript strict mode，无分号，2 空格缩进（匹配现有代码风格）
- 测试命令：`pnpm test`（所有现有 41 个测试必须保持绿色）
- `LedConfig.customFonts` 为可选字段 `string[] | undefined`，不破坏旧版配置
- `serializeConfig` / `exportConfig` 新增第三个参数 `customFonts: string[] = []`，默认值保持向后兼容
- `FontSelector` 新增 props 均为可选，不传时行为与改前完全相同

---

## 文件结构

| 操作 | 文件 |
|---|---|
| **修改** | `src/types/index.ts` |
| **修改** | `src/store/useLedStore.ts` |
| **修改** | `src/store/useLedStore.test.ts` |
| **修改** | `src/utils/configIO.ts` |
| **修改** | `src/utils/configIO.test.ts` |
| **修改** | `src/pages/ConfigPage.tsx` |
| **修改** | `src/components/FontSelector.tsx` |
| **修改** | `src/components/PropertyPanel.tsx` |
| **修改** | `index.html` |

---

## Task 1: LedConfig 类型 + Store 扩展

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/useLedStore.ts`
- Test: `src/store/useLedStore.test.ts`

**Interfaces:**
- Produces:
  - `LedConfig.customFonts?: string[]`
  - `useLedStore.customFonts: string[]`
  - `useLedStore.addCustomFont(font: string): void`
  - `useLedStore.removeCustomFont(font: string): void`
  - `useLedStore.setConfig(config: Pick<LedConfig, 'board' | 'widgets'> & { customFonts?: string[] }): void`

- [ ] **Step 1: 写失败的测试**

  在 `src/store/useLedStore.test.ts` 中：

  **1a. 更新 `beforeEach` 以重置 `customFonts`**（在现有 `setState` 调用中添加 `customFonts: []`）：

  ```ts
  beforeEach(() => {
    useLedStore.setState({
      board: {
        width: 128, height: 64, dotSize: 8, dotGap: 2,
        renderMode: 'realistic', backgroundColor: '#000000',
      },
      widgets: [],
      selectedId: null,
      customFonts: [],
    })
  })
  ```

  **1b. 在现有 `describe('useLedStore', ...)` 块末尾追加新的 describe 块**：

  ```ts
  describe('customFonts', () => {
    it('addCustomFont adds a new font name to the list', () => {
      act(() => { useLedStore.getState().addCustomFont('Comic Sans MS') })
      expect(useLedStore.getState().customFonts).toContain('Comic Sans MS')
    })

    it('addCustomFont does not add duplicate font names', () => {
      act(() => { useLedStore.getState().addCustomFont('Arial') })
      act(() => { useLedStore.getState().addCustomFont('Arial') })
      expect(useLedStore.getState().customFonts.filter((f) => f === 'Arial')).toHaveLength(1)
    })

    it('removeCustomFont removes an existing font name', () => {
      act(() => { useLedStore.getState().addCustomFont('Georgia') })
      act(() => { useLedStore.getState().removeCustomFont('Georgia') })
      expect(useLedStore.getState().customFonts).not.toContain('Georgia')
    })

    it('removeCustomFont is safe when font name does not exist', () => {
      expect(() => {
        act(() => { useLedStore.getState().removeCustomFont('nonexistent') })
      }).not.toThrow()
    })

    it('setConfig with customFonts restores the list', () => {
      const board = useLedStore.getState().board
      act(() => { useLedStore.getState().setConfig({ board, widgets: [], customFonts: ['Papyrus'] }) })
      expect(useLedStore.getState().customFonts).toEqual(['Papyrus'])
    })

    it('setConfig without customFonts defaults to empty array', () => {
      const board = useLedStore.getState().board
      act(() => { useLedStore.getState().addCustomFont('Wingdings') })
      act(() => { useLedStore.getState().setConfig({ board, widgets: [] }) })
      expect(useLedStore.getState().customFonts).toEqual([])
    })
  })
  ```

- [ ] **Step 2: 确认测试失败**

  ```bash
  pnpm test -- useLedStore
  ```

  预期：`addCustomFont` 相关用例报 `TypeError: useLedStore.getState(...).addCustomFont is not a function`

- [ ] **Step 3: 更新 `src/types/index.ts`**

  在 `LedConfig` 类型中添加 `customFonts` 字段（仅此一行改动）：

  ```ts
  export type LedConfig = {
    version: '1.0'
    board: Board
    widgets: Widget[]
    customFonts?: string[]
  }
  ```

- [ ] **Step 4: 替换 `src/store/useLedStore.ts` 为以下完整内容**

  ```ts
  import { create } from 'zustand'
  import { v4 as uuidv4 } from 'uuid'
  import type { Board, Widget, WidgetBase, WidgetType, LedConfig } from '../types'

  const DEFAULT_BOARD: Board = {
    width: 128,
    height: 64,
    dotSize: 8,
    dotGap: 2,
    renderMode: 'realistic',
    backgroundColor: '#000000',
  }

  function makeBase(type: WidgetType): WidgetBase {
    return {
      id: uuidv4(),
      type,
      x: 0,
      y: 0,
      width: 32,
      height: 16,
      color: '#ff0000',
      visible: true,
      zIndex: 0,
    }
  }

  function createDefaultWidget(type: WidgetType): Widget {
    switch (type) {
      case 'datetime':
        return { ...makeBase('datetime'), type: 'datetime', format: 'HH:mm:ss', font: 'Press Start 2P', fontSize: 12, locale: 'en' as const }
      case 'clock':
        return { ...makeBase('clock'), type: 'clock', width: 24, height: 24, showSecondHand: true }
      case 'scrolltext':
        return {
          ...makeBase('scrolltext'),
          type: 'scrolltext',
          items: ['Hello LED!'],
          speed: 60,
          direction: 'left',
          font: 'Press Start 2P',
          fontSize: 14,
          pauseMs: 1000,
        }
      case 'pattern':
        return {
          ...makeBase('pattern'),
          type: 'pattern',
          dots: Array.from({ length: 16 }, () => Array<boolean>(32).fill(false)),
        }
    }
  }

  type LedStore = {
    board: Board
    widgets: Widget[]
    selectedId: string | null
    customFonts: string[]
    setBoard: (patch: Partial<Board>) => void
    addWidget: (type: WidgetType) => void
    updateWidget: (id: string, patch: Partial<Widget>) => void
    removeWidget: (id: string) => void
    selectWidget: (id: string | null) => void
    setWidgets: (widgets: Widget[]) => void
    setConfig: (config: Pick<LedConfig, 'board' | 'widgets'> & { customFonts?: string[] }) => void
    addCustomFont: (font: string) => void
    removeCustomFont: (font: string) => void
  }

  export const useLedStore = create<LedStore>((set) => ({
    board: DEFAULT_BOARD,
    widgets: [],
    selectedId: null,
    customFonts: [],
    setBoard: (patch) => set((s) => ({ board: { ...s.board, ...patch } })),
    addWidget: (type) =>
      set((s) => ({
        widgets: [...s.widgets, createDefaultWidget(type)],
      })),
    updateWidget: (id, patch) =>
      set((s) => ({
        widgets: s.widgets.map((w) => (w.id === id ? ({ ...w, ...patch } as Widget) : w)),
      })),
    removeWidget: (id) =>
      set((s) => ({
        widgets: s.widgets.filter((w) => w.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      })),
    selectWidget: (id) => set({ selectedId: id }),
    setWidgets: (widgets) => set({ widgets }),
    setConfig: ({ board, widgets, customFonts }) =>
      set({ board, widgets, customFonts: customFonts ?? [], selectedId: null }),
    addCustomFont: (font) =>
      set((s) => ({
        customFonts: s.customFonts.includes(font) ? s.customFonts : [...s.customFonts, font],
      })),
    removeCustomFont: (font) =>
      set((s) => ({ customFonts: s.customFonts.filter((f) => f !== font) })),
  }))
  ```

- [ ] **Step 5: 确认所有测试通过**

  ```bash
  pnpm test -- useLedStore
  ```

  预期：11 tests passed (5 existing + 6 new)

- [ ] **Step 6: 提交**

  ```bash
  git add src/types/index.ts src/store/useLedStore.ts src/store/useLedStore.test.ts
  git commit -m "feat: add customFonts to LedConfig and store"
  ```

---

## Task 2: configIO 扩展 + ConfigPage 接入

**Files:**
- Modify: `src/utils/configIO.ts`
- Modify: `src/utils/configIO.test.ts`
- Modify: `src/pages/ConfigPage.tsx`

**Interfaces:**
- Consumes: `LedConfig.customFonts?: string[]`（Task 1）；`useLedStore.customFonts`；`useLedStore.setConfig`
- Produces:
  - `serializeConfig(board, widgets, customFonts?: string[]): string`
  - `exportConfig(board, widgets, customFonts?: string[]): void`

- [ ] **Step 1: 写失败的测试**

  在 `src/utils/configIO.test.ts` 文件顶部，将 import 更新为同时引入 `serializeConfig`：

  ```ts
  import { describe, it, expect } from 'vitest'
  import { parseConfig, serializeConfig } from './configIO'
  import type { LedConfig } from '../types'
  ```

  在文件末尾追加新的 describe 块（保留现有 `parseConfig` 用例不动）：

  ```ts
  const testBoard: LedConfig['board'] = {
    width: 128, height: 64, dotSize: 8, dotGap: 2,
    renderMode: 'realistic', backgroundColor: '#000000',
  }

  describe('serializeConfig', () => {
    it('includes customFonts in the output when provided', () => {
      const json = serializeConfig(testBoard, [], ['Papyrus', 'Impact'])
      const result = JSON.parse(json)
      expect(result.customFonts).toEqual(['Papyrus', 'Impact'])
    })

    it('outputs customFonts as empty array when omitted', () => {
      const json = serializeConfig(testBoard, [])
      const result = JSON.parse(json)
      expect(result.customFonts).toEqual([])
    })

    it('output is valid for parseConfig round-trip', () => {
      const json = serializeConfig(testBoard, [], ['Comic Sans MS'])
      const parsed = parseConfig(json)
      expect(parsed).not.toBeNull()
      expect(parsed?.customFonts).toEqual(['Comic Sans MS'])
    })
  })

  describe('parseConfig with customFonts', () => {
    it('returns customFonts from config when present', () => {
      const config = { ...validConfig, customFonts: ['Comic Sans MS'] }
      const result = parseConfig(JSON.stringify(config))
      expect(result?.customFonts).toEqual(['Comic Sans MS'])
    })

    it('returns undefined for customFonts when field is absent (old config)', () => {
      const result = parseConfig(JSON.stringify(validConfig))
      expect(result?.customFonts).toBeUndefined()
    })
  })
  ```

- [ ] **Step 2: 确认测试失败**

  ```bash
  pnpm test -- configIO
  ```

  预期：`serializeConfig is not a function`（尚未导出）

- [ ] **Step 3: 替换 `src/utils/configIO.ts` 为以下完整内容**

  ```ts
  import type { Board, LedConfig, Widget } from '../types'

  /** Validates and parses a JSON string into a LedConfig. Returns null if invalid. */
  export function parseConfig(json: string): LedConfig | null {
    try {
      const obj = JSON.parse(json)
      if (obj.version !== '1.0') return null
      if (!obj.board || typeof obj.board !== 'object') return null
      if (!Array.isArray(obj.widgets)) return null
      const VALID_TYPES = ['datetime', 'clock', 'scrolltext', 'pattern']
      if (!obj.widgets.every((w: any) => w && VALID_TYPES.includes(w.type))) return null
      return obj as LedConfig
    } catch {
      return null
    }
  }

  /** Serializes board + widgets + customFonts to a JSON string. */
  export function serializeConfig(
    board: Board,
    widgets: Widget[],
    customFonts: string[] = []
  ): string {
    const config: LedConfig = { version: '1.0', board, widgets, customFonts }
    return JSON.stringify(config, null, 2)
  }

  /** Triggers a browser download of the config as a .ledjson file. */
  export function exportConfig(
    board: Board,
    widgets: Widget[],
    customFonts: string[] = []
  ): void {
    const content = serializeConfig(board, widgets, customFonts)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'led-config.ledjson'
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Reads a .ledjson file selected by the user.
   * Returns parsed config or null on failure.
   */
  export async function importConfig(file: File): Promise<LedConfig | null> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        resolve(parseConfig(text))
      }
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    })
  }
  ```

- [ ] **Step 4: 确认 configIO 测试全部通过**

  ```bash
  pnpm test -- configIO
  ```

  预期：10 tests passed（5 existing parseConfig + 5 new）

- [ ] **Step 5: 更新 `src/pages/ConfigPage.tsx`**

  做以下三处修改：

  **5a. 在现有 store 读取行后添加 `customFonts`**：

  ```ts
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)
  const setConfig = useLedStore((s) => s.setConfig)
  const customFonts = useLedStore((s) => s.customFonts)   // ← 新增
  ```

  **5b. 更新 `handleExport`**：

  ```ts
  const handleExport = () => exportConfig(board, widgets, customFonts)
  ```

  **5c. 更新 `handleImport` 中的 `setConfig` 调用**：

  ```ts
  if (config) {
    setConfig({ board: config.board, widgets: config.widgets, customFonts: config.customFonts })
  }
  ```

- [ ] **Step 6: 确认全部测试通过**

  ```bash
  pnpm test
  ```

  预期：全部 47 tests passed（41 原有 + 6 new store + 5 new configIO，去重后实际数量取决于现有测试文件）

- [ ] **Step 7: 提交**

  ```bash
  git add src/utils/configIO.ts src/utils/configIO.test.ts src/pages/ConfigPage.tsx
  git commit -m "feat: extend configIO and ConfigPage to persist customFonts"
  ```

---

## Task 3: FontSelector + PropertyPanel + index.html

**Files:**
- Modify: `index.html`
- Modify: `src/components/FontSelector.tsx`
- Modify: `src/components/PropertyPanel.tsx`

**Interfaces:**
- Consumes: `useLedStore.customFonts`, `addCustomFont`, `removeCustomFont`（Task 1）
- Produces: 扩展后的 `FontSelector` props（所有新 props 均为可选，不破坏现有调用）

> 本任务为纯 UI 变更，无新单元测试（`document.fonts.check` 在 jsdom 中不可用；组件行为通过手动验收覆盖）。

- [ ] **Step 1: 更新 `index.html` 的 Google Fonts 链接**

  将现有的 `<link href="https://fonts.googleapis.com/...">` 整行替换为：

  ```html
  <link
    href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&family=VT323&family=Orbitron:wght@400;700&family=Share+Tech+Mono&family=Nova+Mono&family=Audiowide&family=Noto+Sans+SC:wght@400;700&family=Noto+Serif+SC:wght@400;700&display=swap"
    rel="stylesheet"
  />
  ```

- [ ] **Step 2: 替换 `src/components/FontSelector.tsx` 为以下完整内容**

  ```tsx
  import { useState } from 'react'

  type Props = {
    value: string
    onChange: (font: string) => void
    customFonts?: string[]
    onAddCustomFont?: (font: string) => void
    onRemoveCustomFont?: (font: string) => void
  }

  const PIXEL_FONTS = [
    'Press Start 2P', 'Silkscreen', 'VT323',
    'Orbitron', 'Share Tech Mono', 'Nova Mono', 'Audiowide',
  ]

  const CHINESE_FONTS = [
    'Noto Sans SC', 'Noto Serif SC',
    'SimHei', 'Microsoft YaHei', 'SimSun', 'KaiTi',
  ]

  function isFontAvailable(fontName: string): boolean {
    return document.fonts.check(`16px "${fontName}"`)
  }

  export default function FontSelector({
    value,
    onChange,
    customFonts = [],
    onAddCustomFont,
    onRemoveCustomFont,
  }: Props) {
    const [input, setInput] = useState('')
    const [warnedFont, setWarnedFont] = useState<string | null>(null)

    const selectStyle: React.CSSProperties = {
      background: '#222',
      color: '#fff',
      border: '1px solid #444',
      borderRadius: 4,
      padding: '4px 8px',
      fontSize: 13,
      width: '100%',
    }

    const handleAdd = () => {
      const name = input.trim()
      if (!name) return

      // Already in list: just select it
      if (customFonts.includes(name)) {
        onChange(name)
        setInput('')
        setWarnedFont(null)
        return
      }

      // Second click on same warned font: force save
      if (warnedFont === name) {
        onAddCustomFont?.(name)
        onChange(name)
        setInput('')
        setWarnedFont(null)
        return
      }

      if (!isFontAvailable(name)) {
        setWarnedFont(name)
        return
      }

      onAddCustomFont?.(name)
      onChange(name)
      setInput('')
      setWarnedFont(null)
    }

    return (
      <div>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
          <optgroup label="像素字体">
            {PIXEL_FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </optgroup>
          <optgroup label="中文字体">
            {CHINESE_FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </optgroup>
          {customFonts.length > 0 && (
            <optgroup label="自定义">
              {customFonts.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </optgroup>
          )}
        </select>

        {onAddCustomFont && (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="text"
                placeholder="输入字体名…"
                value={input}
                onChange={(e) => { setInput(e.target.value); setWarnedFont(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                style={{
                  flex: 1,
                  background: '#222',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 13,
                }}
              />
              <button
                onClick={handleAdd}
                disabled={!input.trim()}
                style={{
                  background: input.trim() ? '#1e3a5f' : '#1a1a1a',
                  color: input.trim() ? '#7ec8ff' : '#555',
                  border: '1px solid #2a5a8f',
                  borderRadius: 4,
                  padding: '4px 10px',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                + 添加
              </button>
            </div>

            {warnedFont && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#f0a060' }}>
                ⚠ 字体"{warnedFont}"不可用，再次点击「+ 添加」强制保存
              </p>
            )}

            {customFonts.length > 0 && onRemoveCustomFont && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {customFonts.map((f) => (
                  <span
                    key={f}
                    style={{
                      background: '#333',
                      border: '1px solid #555',
                      borderRadius: 3,
                      padding: '2px 6px',
                      fontSize: 11,
                      color: '#ccc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {f}
                    <button
                      onClick={() => onRemoveCustomFont(f)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#888',
                        padding: 0,
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 3: 更新 `src/components/PropertyPanel.tsx`**

  做以下四处修改：

  **3a. 在 `PropertyPanel` 组件的 store 读取行末尾追加三行**：

  ```ts
  const customFonts = useLedStore((s) => s.customFonts)
  const addCustomFont = useLedStore((s) => s.addCustomFont)
  const removeCustomFont = useLedStore((s) => s.removeCustomFont)
  ```

  **3b. 在 `update` 函数定义之后添加 `fontProps` 常量**：

  ```ts
  const fontProps = {
    customFonts,
    onAddCustomFont: addCustomFont,
    onRemoveCustomFont: removeCustomFont,
  }
  ```

  **3c. 更新 `DateTimePanel` 函数签名和 `FontSelector` 调用**：

  ```tsx
  function DateTimePanel({
    widget,
    update,
    fontProps,
  }: {
    widget: DateTimeWidget
    update: (p: Partial<Widget>) => void
    fontProps: { customFonts: string[]; onAddCustomFont: (f: string) => void; onRemoveCustomFont: (f: string) => void }
  }) {
  ```

  在该函数内，将：
  ```tsx
  <FontSelector value={widget.font} onChange={(f) => update({ font: f } as any)} />
  ```
  替换为：
  ```tsx
  <FontSelector value={widget.font} onChange={(f) => update({ font: f } as any)} {...fontProps} />
  ```

  **3d. 同理更新 `ScrollTextPanel`**（签名和 FontSelector 调用与 3c 完全相同的改法）：

  ```tsx
  function ScrollTextPanel({
    widget,
    update,
    fontProps,
  }: {
    widget: ScrollTextWidget
    update: (p: Partial<Widget>) => void
    fontProps: { customFonts: string[]; onAddCustomFont: (f: string) => void; onRemoveCustomFont: (f: string) => void }
  }) {
  ```

  在该函数内，将：
  ```tsx
  <FontSelector value={widget.font} onChange={(f) => update({ font: f } as any)} />
  ```
  替换为：
  ```tsx
  <FontSelector value={widget.font} onChange={(f) => update({ font: f } as any)} {...fontProps} />
  ```

  **3e. 更新 `PropertyPanel` 底部的面板渲染，传入 `fontProps`**：

  ```tsx
  {selected.type === 'datetime' && <DateTimePanel widget={selected as DateTimeWidget} update={update} fontProps={fontProps} />}
  {selected.type === 'scrolltext' && <ScrollTextPanel widget={selected as ScrollTextWidget} update={update} fontProps={fontProps} />}
  ```

- [ ] **Step 4: 确认全部测试通过**

  ```bash
  pnpm test
  ```

  预期：所有测试 PASS，无新增失败

- [ ] **Step 5: 提交**

  ```bash
  git add index.html src/components/FontSelector.tsx src/components/PropertyPanel.tsx
  git commit -m "feat: expand font library and add custom font input with persistence"
  ```

---

## 手动验收

完成上述 3 个任务后，在浏览器中验证：

1. **新字体可选：** 配置页选中 datetime/scrolltext widget，下拉框显示 7 款像素字体 + 6 款中文字体分组
2. **自定义输入（已安装字体）：** 输入 `"Courier New"` → 无警告 → 出现在自定义分组 → canvas 渲染该字体
3. **自定义输入（未安装字体）：** 输入 `"MyFakeFont123"` → 显示橙色警告 → 再次点击「+ 添加」 → 字体保存
4. **删除自定义字体：** 自定义分组的 tag 点击「×」→ 从列表消失（widget 已选中该字体的不受影响）
5. **导出/导入持久化：** 导出 `.ledjson` 包含 `"customFonts"` 字段 → 清空 → 导入 → 自定义分组还原
