# LED Screen Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable React web app that simulates an LED dot-matrix sign with configurable widgets (datetime, analog clock, scrolling text, custom pattern), a full-screen display page, and a three-column configuration page.

**Architecture:** Canvas 2D renders the LED grid each animation frame; each widget is first rasterized to an OffscreenCanvas, then pixel-sampled dot-by-dot to determine which LEDs are lit. Zustand holds all state; React Router connects the display page (`/`) and config page (`/config`).

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, Zustand, dayjs, uuid, react-draggable, Vitest, @testing-library/react

## Global Constraints

- Node ≥ 20, npm ≥ 10
- TypeScript strict mode enabled
- All widget coordinates and dimensions are in **dots** (not pixels); pixels = dots × (dotSize + dotGap)
- OffscreenCanvas sizing for rasterizers: `widget.width * dotSize` × `widget.height * dotSize` (no gaps — gaps only appear on the main canvas)
- Pixel sampling in rasterizers: center of each dot cell = `col * dotSize + Math.floor(dotSize / 2)`, `row * dotSize + Math.floor(dotSize / 2)`; alpha threshold = 128
- Config file extension: `.ledjson`; format version field must be `"1.0"`
- Google Fonts loaded via `<link>` in `index.html`: `Press Start 2P`, `Silkscreen`, `VT323`
- No external CSS framework — plain CSS Modules or inline styles only

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/pages/DisplayPage.tsx` (placeholder)
- Create: `src/pages/ConfigPage.tsx` (placeholder)
- Create: `vitest.setup.ts`

**Interfaces:**
- Produces: Running dev server at `http://localhost:5173`; routes `/` and `/config` render placeholder text; `npm test` exits 0

- [ ] **Step 1: Scaffold with Vite**

```bash
cd /Users/ernest/PersonalCode/Projects/led-screen
npm create vite@latest . -- --template react-ts
```

Answer prompts: select existing directory → proceed.

- [ ] **Step 2: Install dependencies**

```bash
npm install zustand react-router-dom dayjs uuid react-draggable
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @types/uuid @types/react-draggable vitest-canvas-mock
```

- [ ] **Step 3: Replace `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```typescript
import 'vitest-canvas-mock'
import '@testing-library/jest-dom'

// Polyfill OffscreenCanvas for jsdom
if (typeof OffscreenCanvas === 'undefined') {
  ;(globalThis as any).OffscreenCanvas = class {
    width: number
    height: number
    constructor(w: number, h: number) {
      this.width = w
      this.height = h
    }
    getContext() {
      const canvas = document.createElement('canvas')
      canvas.width = this.width
      canvas.height = this.height
      return canvas.getContext('2d')
    }
  }
}
```

- [ ] **Step 5: Update `index.html`** — add Google Fonts and set title

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LED Screen Simulator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&family=VT323&display=swap"
      rel="stylesheet"
    />
  </head>
  <body style="margin:0;background:#000;">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 7: Create `src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import DisplayPage from './pages/DisplayPage'
import ConfigPage from './pages/ConfigPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DisplayPage />} />
      <Route path="/config" element={<ConfigPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 8: Create `src/pages/DisplayPage.tsx` (placeholder)**

```tsx
export default function DisplayPage() {
  return <div style={{ color: 'white', padding: 20 }}>Display Page – TODO</div>
}
```

- [ ] **Step 9: Create `src/pages/ConfigPage.tsx` (placeholder)**

```tsx
export default function ConfigPage() {
  return <div style={{ color: 'white', padding: 20 }}>Config Page – TODO</div>
}
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts at `http://localhost:5173`. Visiting `/` shows "Display Page – TODO", visiting `/config` shows "Config Page – TODO". Stop with Ctrl+C.

- [ ] **Step 11: Run tests (should pass with 0 test files)**

```bash
npm test -- --run
```

Expected output: `Test Files 0 passed (0)`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS project with routing"
```

---

### Task 2: Types & Zustand Store

**Files:**
- Create: `src/types/index.ts`
- Create: `src/store/useLedStore.ts`
- Create: `src/store/useLedStore.test.ts`

**Interfaces:**
- Produces: `Board`, `Widget`, `DateTimeWidget`, `ClockWidget`, `ScrollTextWidget`, `PatternWidget`, `LedConfig` types; `useLedStore` hook with `board`, `widgets`, `selectedId`, `setBoard`, `addWidget`, `updateWidget`, `removeWidget`, `selectWidget`, `setConfig`

- [ ] **Step 1: Write failing test**

Create `src/store/useLedStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useLedStore } from './useLedStore'

beforeEach(() => {
  // Reset store between tests
  useLedStore.setState({
    board: {
      width: 128, height: 64, dotSize: 8, dotGap: 2,
      renderMode: 'realistic', backgroundColor: '#000000',
    },
    widgets: [],
    selectedId: null,
  })
})

describe('useLedStore', () => {
  it('has default board with width 128', () => {
    expect(useLedStore.getState().board.width).toBe(128)
  })

  it('addWidget creates a datetime widget with required fields', () => {
    act(() => { useLedStore.getState().addWidget('datetime') })
    const w = useLedStore.getState().widgets[0]
    expect(w.type).toBe('datetime')
    expect(w.id).toBeTruthy()
    expect(typeof (w as any).format).toBe('string')
  })

  it('removeWidget deletes the widget and clears selectedId', () => {
    act(() => { useLedStore.getState().addWidget('clock') })
    const id = useLedStore.getState().widgets[0].id
    act(() => { useLedStore.getState().selectWidget(id) })
    act(() => { useLedStore.getState().removeWidget(id) })
    expect(useLedStore.getState().widgets).toHaveLength(0)
    expect(useLedStore.getState().selectedId).toBeNull()
  })

  it('updateWidget patches only the specified fields', () => {
    act(() => { useLedStore.getState().addWidget('scrolltext') })
    const id = useLedStore.getState().widgets[0].id
    act(() => { useLedStore.getState().updateWidget(id, { color: '#00ff00' }) })
    expect(useLedStore.getState().widgets[0].color).toBe('#00ff00')
    expect(useLedStore.getState().widgets[0].type).toBe('scrolltext')
  })

  it('setConfig replaces board and widgets', () => {
    const newBoard = { width: 64, height: 32, dotSize: 6, dotGap: 1, renderMode: 'clean' as const, backgroundColor: '#111111' }
    act(() => { useLedStore.getState().setConfig({ board: newBoard, widgets: [] }) })
    expect(useLedStore.getState().board.width).toBe(64)
    expect(useLedStore.getState().selectedId).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect failure (module not found)**

```bash
npm test -- --run src/store/useLedStore.test.ts
```

Expected: FAIL — `Cannot find module './useLedStore'`

- [ ] **Step 3: Create `src/types/index.ts`**

```typescript
export type RenderMode = 'realistic' | 'clean'

export type Board = {
  width: number
  height: number
  dotSize: number
  dotGap: number
  renderMode: RenderMode
  backgroundColor: string
}

export type WidgetType = 'datetime' | 'clock' | 'scrolltext' | 'pattern'

export type WidgetBase = {
  id: string
  type: WidgetType
  x: number
  y: number
  width: number
  height: number
  color: string
  visible: boolean
  zIndex: number
}

export type DateTimeWidget = WidgetBase & {
  type: 'datetime'
  format: string
  font: string
  fontSize: number
}

export type ClockWidget = WidgetBase & {
  type: 'clock'
  showSecondHand: boolean
}

export type ScrollTextWidget = WidgetBase & {
  type: 'scrolltext'
  items: string[]
  speed: number
  direction: 'left' | 'right' | 'up' | 'down'
  font: string
  fontSize: number
  pauseMs: number
}

export type PatternWidget = WidgetBase & {
  type: 'pattern'
  dots: boolean[][]
}

export type Widget = DateTimeWidget | ClockWidget | ScrollTextWidget | PatternWidget

export type LedConfig = {
  version: '1.0'
  board: Board
  widgets: Widget[]
}
```

- [ ] **Step 4: Create `src/store/useLedStore.ts`**

```typescript
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
      return { ...makeBase('datetime'), type: 'datetime', format: 'HH:mm:ss', font: 'Press Start 2P', fontSize: 12 }
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
  setBoard: (patch: Partial<Board>) => void
  addWidget: (type: WidgetType) => void
  updateWidget: (id: string, patch: Partial<Widget>) => void
  removeWidget: (id: string) => void
  selectWidget: (id: string | null) => void
  setWidgets: (widgets: Widget[]) => void
  setConfig: (config: Pick<LedConfig, 'board' | 'widgets'>) => void
}

export const useLedStore = create<LedStore>((set) => ({
  board: DEFAULT_BOARD,
  widgets: [],
  selectedId: null,
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
  setConfig: ({ board, widgets }) => set({ board, widgets, selectedId: null }),
}))
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test -- --run src/store/useLedStore.test.ts
```

Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/types src/store
git commit -m "feat: add TypeScript types and Zustand store"
```

---

### Task 3: LED Dot Renderer

**Files:**
- Create: `src/renderer/drawLedDot.ts`
- Create: `src/renderer/drawLedDot.test.ts`

**Interfaces:**
- Consumes: `RenderMode` from `../types`
- Produces: `drawLedDot(ctx, cx, cy, radius, color, lit, mode): void`

- [ ] **Step 1: Write failing test**

Create `src/renderer/drawLedDot.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { drawLedDot } from './drawLedDot'

describe('drawLedDot', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    ctx = canvas.getContext('2d')!
  })

  it('sets fillStyle to dim color when not lit', () => {
    drawLedDot(ctx, 50, 50, 4, '#ff0000', false, 'clean')
    expect(ctx.fillStyle).toBe('#1a1a1a')
  })

  it('sets fillStyle to widget color when lit in clean mode', () => {
    drawLedDot(ctx, 50, 50, 4, '#00ff00', true, 'clean')
    expect(ctx.fillStyle).toBe('#00ff00')
  })

  it('calls arc to draw a circle', () => {
    drawLedDot(ctx, 50, 50, 4, '#ffffff', true, 'clean')
    // vitest-canvas-mock records calls
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 4, 0, Math.PI * 2)
  })

  it('sets shadowBlur to 0 for clean mode lit dot', () => {
    drawLedDot(ctx, 50, 50, 4, '#ff0000', true, 'clean')
    expect(ctx.shadowBlur).toBe(0)
  })

  it('resets shadowBlur to 0 after realistic lit dot', () => {
    drawLedDot(ctx, 50, 50, 4, '#ff0000', true, 'realistic')
    expect(ctx.shadowBlur).toBe(0) // reset after draw
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- --run src/renderer/drawLedDot.test.ts
```

Expected: FAIL — `Cannot find module './drawLedDot'`

- [ ] **Step 3: Create `src/renderer/drawLedDot.ts`**

```typescript
import type { RenderMode } from '../types'

export function drawLedDot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  lit: boolean,
  mode: RenderMode
): void {
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)

  if (!lit) {
    ctx.shadowBlur = 0
    ctx.fillStyle = '#1a1a1a'
    ctx.fill()
    return
  }

  if (mode === 'realistic') {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.4, color)
    grad.addColorStop(1, color + '88')
    ctx.shadowBlur = radius * 3
    ctx.shadowColor = color
    ctx.fillStyle = grad
  } else {
    ctx.shadowBlur = 0
    ctx.fillStyle = color
  }

  ctx.fill()
  ctx.shadowBlur = 0
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- --run src/renderer/drawLedDot.test.ts
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/drawLedDot.ts src/renderer/drawLedDot.test.ts
git commit -m "feat: add LED dot drawing function (realistic + clean modes)"
```

---

### Task 4: Rasterizers — Pattern & DateTime

**Files:**
- Create: `src/renderer/rasterize/rasterizePattern.ts`
- Create: `src/renderer/rasterize/rasterizeDateTime.ts`
- Create: `src/renderer/rasterize/rasterizePattern.test.ts`
- Create: `src/renderer/rasterize/rasterizeDateTime.test.ts`

**Interfaces:**
- Consumes: `PatternWidget`, `DateTimeWidget` from `../../types`
- Produces:
  - `rasterizePattern(widget: PatternWidget, dotSize: number): OffscreenCanvas`
  - `rasterizeDateTime(widget: DateTimeWidget, dotSize: number): OffscreenCanvas`

- [ ] **Step 1: Write failing tests**

Create `src/renderer/rasterize/rasterizePattern.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { rasterizePattern } from './rasterizePattern'
import type { PatternWidget } from '../../types'

const makePatternWidget = (overrides?: Partial<PatternWidget>): PatternWidget => ({
  id: 'p1', type: 'pattern', x: 0, y: 0, width: 4, height: 2,
  color: '#ff0000', visible: true, zIndex: 0,
  dots: [
    [true, false, true, false],
    [false, true, false, true],
  ],
  ...overrides,
})

describe('rasterizePattern', () => {
  it('returns an OffscreenCanvas with width = widget.width * dotSize', () => {
    const w = makePatternWidget()
    const canvas = rasterizePattern(w, 8)
    expect(canvas.width).toBe(4 * 8)
  })

  it('returns an OffscreenCanvas with height = widget.height * dotSize', () => {
    const w = makePatternWidget()
    const canvas = rasterizePattern(w, 8)
    expect(canvas.height).toBe(2 * 8)
  })
})
```

Create `src/renderer/rasterize/rasterizeDateTime.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { rasterizeDateTime } from './rasterizeDateTime'
import type { DateTimeWidget } from '../../types'

const makeWidget = (): DateTimeWidget => ({
  id: 'd1', type: 'datetime', x: 0, y: 0, width: 48, height: 8,
  color: '#ff0000', visible: true, zIndex: 0,
  format: 'HH:mm', font: 'monospace', fontSize: 12,
})

describe('rasterizeDateTime', () => {
  it('returns OffscreenCanvas with correct dimensions', () => {
    const c = rasterizeDateTime(makeWidget(), 8)
    expect(c.width).toBe(48 * 8)
    expect(c.height).toBe(8 * 8)
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- --run src/renderer/rasterize/
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/renderer/rasterize/rasterizePattern.ts`**

```typescript
import type { PatternWidget } from '../../types'

/**
 * Rasterizes a PatternWidget to an OffscreenCanvas.
 * Canvas size: (widget.width * dotSize) × (widget.height * dotSize).
 * Each dot cell is dotSize × dotSize pixels. A lit dot fills its cell with white.
 */
export function rasterizePattern(widget: PatternWidget, dotSize: number): OffscreenCanvas {
  const { width, height, dots } = widget
  const canvas = new OffscreenCanvas(width * dotSize, height * dotSize)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (dots[row]?.[col]) {
        ctx.fillRect(col * dotSize, row * dotSize, dotSize, dotSize)
      }
    }
  }

  return canvas
}
```

- [ ] **Step 4: Create `src/renderer/rasterize/rasterizeDateTime.ts`**

```typescript
import dayjs from 'dayjs'
import type { DateTimeWidget } from '../../types'

/**
 * Rasterizes the current date/time string to an OffscreenCanvas.
 * Canvas size: (widget.width * dotSize) × (widget.height * dotSize).
 */
export function rasterizeDateTime(widget: DateTimeWidget, dotSize: number): OffscreenCanvas {
  const { width, height, format, font, fontSize } = widget
  const canvasW = width * dotSize
  const canvasH = height * dotSize
  const canvas = new OffscreenCanvas(canvasW, canvasH)
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = '#ffffff'
  ctx.font = `${fontSize}px "${font}"`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(dayjs().format(format), canvasW / 2, canvasH / 2)

  return canvas
}
```

- [ ] **Step 5: Run — expect pass**

```bash
npm test -- --run src/renderer/rasterize/
```

Expected: `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/rasterize/rasterizePattern.ts src/renderer/rasterize/rasterizePattern.test.ts \
        src/renderer/rasterize/rasterizeDateTime.ts src/renderer/rasterize/rasterizeDateTime.test.ts
git commit -m "feat: add Pattern and DateTime rasterizers"
```

---

### Task 5: Rasterizers — Clock & ScrollText

**Files:**
- Create: `src/renderer/rasterize/rasterizeClock.ts`
- Create: `src/renderer/rasterize/rasterizeScrollText.ts`
- Create: `src/renderer/rasterize/rasterizeClock.test.ts`
- Create: `src/renderer/rasterize/rasterizeScrollText.test.ts`

**Interfaces:**
- Consumes: `ClockWidget`, `ScrollTextWidget` from `../../types`
- Produces:
  - `rasterizeClock(widget: ClockWidget, dotSize: number): OffscreenCanvas`
  - `ScrollState { itemIndex: number; offset: number; pauseRemaining: number }`
  - `rasterizeScrollText(widget: ScrollTextWidget, dotSize: number, state: ScrollState, deltaMs: number): OffscreenCanvas` — mutates `state` in place

- [ ] **Step 1: Write failing tests**

Create `src/renderer/rasterize/rasterizeClock.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { rasterizeClock } from './rasterizeClock'
import type { ClockWidget } from '../../types'

const makeClockWidget = (): ClockWidget => ({
  id: 'c1', type: 'clock', x: 0, y: 0, width: 24, height: 24,
  color: '#ffffff', visible: true, zIndex: 0, showSecondHand: true,
})

describe('rasterizeClock', () => {
  it('returns OffscreenCanvas with correct dimensions', () => {
    const c = rasterizeClock(makeClockWidget(), 8)
    expect(c.width).toBe(24 * 8)
    expect(c.height).toBe(24 * 8)
  })
})
```

Create `src/renderer/rasterize/rasterizeScrollText.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { rasterizeScrollText, createScrollState } from './rasterizeScrollText'
import type { ScrollTextWidget } from '../../types'

const makeWidget = (): ScrollTextWidget => ({
  id: 's1', type: 'scrolltext', x: 0, y: 0, width: 32, height: 8,
  color: '#ff0000', visible: true, zIndex: 0,
  items: ['Hello', 'World'],
  speed: 60,
  direction: 'left',
  font: 'monospace',
  fontSize: 12,
  pauseMs: 500,
})

describe('rasterizeScrollText', () => {
  it('createScrollState returns initial state with itemIndex 0 and offset 0', () => {
    const state = createScrollState()
    expect(state.itemIndex).toBe(0)
    expect(state.offset).toBe(0)
    expect(state.pauseRemaining).toBe(0)
  })

  it('returns OffscreenCanvas with correct dimensions', () => {
    const state = createScrollState()
    const c = rasterizeScrollText(makeWidget(), 8, state, 16)
    expect(c.width).toBe(32 * 8)
    expect(c.height).toBe(8 * 8)
  })

  it('advances offset by speed * deltaMs/1000 when not pausing', () => {
    const state = createScrollState()
    // deltaMs=1000ms → offset increases by speed=60 px
    rasterizeScrollText(makeWidget(), 8, state, 1000)
    expect(state.offset).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- --run src/renderer/rasterize/rasterizeClock.test.ts src/renderer/rasterize/rasterizeScrollText.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/renderer/rasterize/rasterizeClock.ts`**

```typescript
import type { ClockWidget } from '../../types'

/**
 * Rasterizes an analog clock face to an OffscreenCanvas.
 * Clock uses a circular face with hour markers, hour/minute/second hands.
 */
export function rasterizeClock(widget: ClockWidget, dotSize: number): OffscreenCanvas {
  const { width, height, showSecondHand } = widget
  const canvasW = width * dotSize
  const canvasH = height * dotSize
  const canvas = new OffscreenCanvas(canvasW, canvasH)
  const ctx = canvas.getContext('2d')!

  const cx = canvasW / 2
  const cy = canvasH / 2
  const r = Math.min(cx, cy) * 0.9

  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = Math.max(1, dotSize / 4)

  // Clock face circle
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // Hour markers (12 ticks)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
    const inner = r * 0.85
    const outer = r * 0.95
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)
    ctx.stroke()
  }

  const now = new Date()
  const h = now.getHours() % 12
  const m = now.getMinutes()
  const s = now.getSeconds()

  // Hour hand
  const hAngle = ((h + m / 60) / 12) * Math.PI * 2 - Math.PI / 2
  drawHand(ctx, cx, cy, hAngle, r * 0.5, Math.max(2, dotSize / 3))

  // Minute hand
  const mAngle = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2
  drawHand(ctx, cx, cy, mAngle, r * 0.75, Math.max(1, dotSize / 4))

  // Second hand
  if (showSecondHand) {
    const sAngle = (s / 60) * Math.PI * 2 - Math.PI / 2
    ctx.strokeStyle = '#ff4444'
    ctx.lineWidth = Math.max(1, dotSize / 6)
    drawHand(ctx, cx, cy, sAngle, r * 0.85, Math.max(1, dotSize / 6))
    ctx.strokeStyle = '#ffffff'
  }

  // Center dot
  ctx.beginPath()
  ctx.arc(cx, cy, Math.max(1, dotSize / 4), 0, Math.PI * 2)
  ctx.fill()

  return canvas
}

function drawHand(
  ctx: OffscreenCanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width: number
): void {
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length)
  ctx.stroke()
}
```

- [ ] **Step 4: Create `src/renderer/rasterize/rasterizeScrollText.ts`**

```typescript
import type { ScrollTextWidget } from '../../types'

export type ScrollState = {
  itemIndex: number
  offset: number
  pauseRemaining: number
}

export function createScrollState(): ScrollState {
  return { itemIndex: 0, offset: 0, pauseRemaining: 0 }
}

/**
 * Rasterizes the current scroll text frame. Mutates `state` in place.
 * Canvas size: (widget.width * dotSize) × (widget.height * dotSize).
 */
export function rasterizeScrollText(
  widget: ScrollTextWidget,
  dotSize: number,
  state: ScrollState,
  deltaMs: number
): OffscreenCanvas {
  const { width, height, items, speed, direction, font, fontSize, pauseMs } = widget
  const canvasW = width * dotSize
  const canvasH = height * dotSize
  const canvas = new OffscreenCanvas(canvasW, canvasH)
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = '#ffffff'
  ctx.font = `${fontSize}px "${font}"`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'start'

  if (items.length === 0) return canvas

  const text = items[state.itemIndex % items.length]
  const textW = ctx.measureText(text).width

  if (state.pauseRemaining > 0) {
    // Pause: draw text centered, decrement timer
    ctx.textAlign = 'center'
    ctx.fillText(text, canvasW / 2, canvasH / 2)
    state.pauseRemaining = Math.max(0, state.pauseRemaining - deltaMs)
  } else {
    const pixelStep = speed * (deltaMs / 1000)

    if (direction === 'left') {
      const x = canvasW - state.offset
      ctx.fillText(text, x, canvasH / 2)
      state.offset += pixelStep
      // Text fully scrolled off left edge
      if (state.offset > canvasW + textW) {
        state.offset = 0
        state.itemIndex = (state.itemIndex + 1) % items.length
        state.pauseRemaining = pauseMs
      }
    } else if (direction === 'right') {
      const x = -textW + state.offset
      ctx.fillText(text, x, canvasH / 2)
      state.offset += pixelStep
      if (state.offset > canvasW + textW) {
        state.offset = 0
        state.itemIndex = (state.itemIndex + 1) % items.length
        state.pauseRemaining = pauseMs
      }
    } else if (direction === 'up') {
      ctx.textAlign = 'center'
      const y = canvasH - state.offset
      ctx.fillText(text, canvasW / 2, y)
      state.offset += pixelStep
      if (state.offset > canvasH + fontSize) {
        state.offset = 0
        state.itemIndex = (state.itemIndex + 1) % items.length
        state.pauseRemaining = pauseMs
      }
    } else {
      // down
      ctx.textAlign = 'center'
      const y = -fontSize + state.offset
      ctx.fillText(text, canvasW / 2, y)
      state.offset += pixelStep
      if (state.offset > canvasH + fontSize) {
        state.offset = 0
        state.itemIndex = (state.itemIndex + 1) % items.length
        state.pauseRemaining = pauseMs
      }
    }
  }

  return canvas
}
```

- [ ] **Step 5: Run — expect pass**

```bash
npm test -- --run src/renderer/rasterize/
```

Expected: `7 passed` (4 from Task 4 + 3 new).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/rasterize/
git commit -m "feat: add Clock and ScrollText rasterizers"
```

---

### Task 6: Render Frame + LedCanvas Component

**Files:**
- Create: `src/renderer/renderFrame.ts`
- Create: `src/components/LedCanvas.tsx`

**Interfaces:**
- Consumes: All rasterizers, `drawLedDot`, `Board`, `Widget` types; `ScrollState`, `createScrollState` from rasterizeScrollText
- Produces: `renderFrame(ctx, board, widgets, scrollStates, deltaMs): void`; `<LedCanvas board widgets scale? />` React component

- [ ] **Step 1: Create `src/renderer/renderFrame.ts`**

```typescript
import type { Board, Widget, DateTimeWidget, ClockWidget, ScrollTextWidget, PatternWidget } from '../types'
import { drawLedDot } from './drawLedDot'
import { rasterizeDateTime } from './rasterize/rasterizeDateTime'
import { rasterizeClock } from './rasterize/rasterizeClock'
import { rasterizeScrollText, type ScrollState } from './rasterize/rasterizeScrollText'
import { rasterizePattern } from './rasterize/rasterizePattern'

const ALPHA_THRESHOLD = 128

/**
 * Renders one frame of the LED display to `ctx`.
 * `scrollStates` is a Map<widgetId, ScrollState> managed by the caller.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  board: Board,
  widgets: Widget[],
  scrollStates: Map<string, ScrollState>,
  deltaMs: number
): void {
  const { width, height, dotSize, dotGap, backgroundColor, renderMode } = board
  const step = dotSize + dotGap
  const radius = dotSize / 2

  // Clear canvas
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  // Draw all dim dots first
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cx = col * step + radius
      const cy = row * step + radius
      drawLedDot(ctx, cx, cy, radius, '#000000', false, renderMode)
    }
  }

  // Render each visible widget sorted by zIndex
  const visible = widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.zIndex - b.zIndex)

  for (const widget of visible) {
    const offscreen = rasterizeWidget(widget, dotSize, scrollStates, deltaMs)
    if (!offscreen) continue

    const offCtx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D | null
    if (!offCtx) continue

    for (let row = 0; row < widget.height; row++) {
      for (let col = 0; col < widget.width; col++) {
        const px = col * dotSize + Math.floor(dotSize / 2)
        const py = row * dotSize + Math.floor(dotSize / 2)
        const pixel = offCtx.getImageData(px, py, 1, 1).data
        const alpha = pixel[3]

        const screenX = (widget.x + col) * step + radius
        const screenY = (widget.y + row) * step + radius
        drawLedDot(ctx, screenX, screenY, radius, widget.color, alpha > ALPHA_THRESHOLD, renderMode)
      }
    }
  }
}

function rasterizeWidget(
  widget: Widget,
  dotSize: number,
  scrollStates: Map<string, ScrollState>,
  deltaMs: number
): OffscreenCanvas | null {
  switch (widget.type) {
    case 'datetime':
      return rasterizeDateTime(widget as DateTimeWidget, dotSize)
    case 'clock':
      return rasterizeClock(widget as ClockWidget, dotSize)
    case 'scrolltext': {
      let state = scrollStates.get(widget.id)
      if (!state) {
        state = { itemIndex: 0, offset: 0, pauseRemaining: 0 }
        scrollStates.set(widget.id, state)
      }
      return rasterizeScrollText(widget as ScrollTextWidget, dotSize, state, deltaMs)
    }
    case 'pattern':
      return rasterizePattern(widget as PatternWidget, dotSize)
    default:
      return null
  }
}
```

- [ ] **Step 2: Create `src/components/LedCanvas.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import type { Board, Widget } from '../types'
import { renderFrame } from '../renderer/renderFrame'
import type { ScrollState } from '../renderer/rasterize/rasterizeScrollText'

type Props = {
  board: Board
  widgets: Widget[]
  /** Rendering scale factor (default 1). Scales the canvas element visually. */
  scale?: number
  style?: React.CSSProperties
}

export default function LedCanvas({ board, widgets, scale = 1, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollStatesRef = useRef<Map<string, ScrollState>>(new Map())
  const lastTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const step = board.dotSize + board.dotGap
  const canvasW = board.width * step
  const canvasH = board.height * step

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function loop(timestamp: number) {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16
      lastTimeRef.current = timestamp
      renderFrame(ctx!, board, widgets, scrollStatesRef.current, delta)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [board, widgets])

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      style={{
        display: 'block',
        width: canvasW * scale,
        height: canvasH * scale,
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  )
}
```

- [ ] **Step 3: Manual test — start dev server and visually verify**

```bash
npm run dev
```

No automated test for the canvas render loop — test visually after DisplayPage (Task 7) is complete.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/renderFrame.ts src/components/LedCanvas.tsx
git commit -m "feat: add render frame orchestrator and LedCanvas component"
```

---

### Task 7: DisplayPage

**Files:**
- Modify: `src/pages/DisplayPage.tsx`

**Interfaces:**
- Consumes: `useLedStore`, `LedCanvas`
- Produces: Full-screen LED display at `/` with a settings button linking to `/config`

- [ ] **Step 1: Replace `src/pages/DisplayPage.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { useLedStore } from '../store/useLedStore'
import LedCanvas from '../components/LedCanvas'

export default function DisplayPage() {
  const navigate = useNavigate()
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)

  const step = board.dotSize + board.dotGap
  const canvasW = board.width * step
  const canvasH = board.height * step

  // Scale canvas to fill viewport while maintaining aspect ratio
  const scaleX = window.innerWidth / canvasW
  const scaleY = window.innerHeight / canvasH
  const scale = Math.min(scaleX, scaleY)

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <LedCanvas board={board} widgets={widgets} scale={scale} />

      <button
        onClick={() => navigate('/config')}
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 6,
          padding: '6px 14px',
          cursor: 'pointer',
          fontSize: 13,
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      >
        ⚙ 配置
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add a demo widget to store defaults for visual verification**

Open `src/store/useLedStore.ts`. In the `useLedStore` initial state, add a demo scrolltext widget so the display is non-empty on first load. Temporarily add this after the `widgets: []` line:

```typescript
// Temporary demo – remove before final deploy or leave as default
widgets: [
  {
    id: 'demo-scroll',
    type: 'scrolltext',
    x: 4,
    y: 8,
    width: 120,
    height: 12,
    color: '#00ff00',
    visible: true,
    zIndex: 0,
    items: ['LED Screen Simulator', '欢迎使用 LED 灯牌模拟器'],
    speed: 80,
    direction: 'left',
    font: 'Press Start 2P',
    fontSize: 10,
    pauseMs: 500,
  },
],
```

- [ ] **Step 3: Visual test — confirm LED display renders**

```bash
npm run dev
```

Open `http://localhost:5173`. Expected: black screen with green scrolling LED text on a dot grid. A "⚙ 配置" button appears top-right. Clicking it goes to `/config` (still placeholder). Verify both realistic and clean modes by temporarily editing the store's `renderMode`.

Remove the demo widget from store defaults (restore `widgets: []`) after verifying.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DisplayPage.tsx src/store/useLedStore.ts
git commit -m "feat: implement full-screen LED DisplayPage"
```

---

### Task 8: Config IO & Image Import Utilities

**Files:**
- Create: `src/utils/configIO.ts`
- Create: `src/utils/imageToPattern.ts`
- Create: `src/utils/configIO.test.ts`
- Create: `src/utils/imageToPattern.test.ts`

**Interfaces:**
- Produces:
  - `exportConfig(board, widgets): void` — triggers `.ledjson` download
  - `parseConfig(json: string): LedConfig | null` — validates and parses JSON
  - `imageToPattern(file: File, cols: number, rows: number, threshold: number): Promise<boolean[][]>`

- [ ] **Step 1: Write failing tests**

Create `src/utils/configIO.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseConfig } from './configIO'
import type { LedConfig } from '../types'

const validConfig: LedConfig = {
  version: '1.0',
  board: { width: 128, height: 64, dotSize: 8, dotGap: 2, renderMode: 'realistic', backgroundColor: '#000000' },
  widgets: [],
}

describe('parseConfig', () => {
  it('returns config object for valid JSON', () => {
    const result = parseConfig(JSON.stringify(validConfig))
    expect(result).not.toBeNull()
    expect(result?.board.width).toBe(128)
  })

  it('returns null for invalid JSON', () => {
    expect(parseConfig('not json')).toBeNull()
  })

  it('returns null if version is missing', () => {
    const bad = { ...validConfig, version: undefined }
    expect(parseConfig(JSON.stringify(bad))).toBeNull()
  })

  it('returns null if board is missing', () => {
    const bad = { version: '1.0', widgets: [] }
    expect(parseConfig(JSON.stringify(bad))).toBeNull()
  })

  it('returns null if widgets is not an array', () => {
    const bad = { ...validConfig, widgets: 'bad' }
    expect(parseConfig(JSON.stringify(bad))).toBeNull()
  })
})
```

Create `src/utils/imageToPattern.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { imageToPattern } from './imageToPattern'

describe('imageToPattern', () => {
  it('returns a 2D boolean array with correct dimensions', async () => {
    // Mock File and createImageBitmap
    const mockFile = new File([''], 'test.png', { type: 'image/png' })

    // Mock createImageBitmap
    ;(globalThis as any).createImageBitmap = vi.fn().mockResolvedValue({
      width: 10,
      height: 10,
      close: vi.fn(),
    })

    const result = await imageToPattern(mockFile, 4, 2, 128)
    expect(result.length).toBe(2)       // rows
    expect(result[0].length).toBe(4)    // cols
    expect(typeof result[0][0]).toBe('boolean')
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- --run src/utils/
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/utils/configIO.ts`**

```typescript
import type { Board, LedConfig, Widget } from '../types'

/** Validates and parses a JSON string into a LedConfig. Returns null if invalid. */
export function parseConfig(json: string): LedConfig | null {
  try {
    const obj = JSON.parse(json)
    if (obj.version !== '1.0') return null
    if (!obj.board || typeof obj.board !== 'object') return null
    if (!Array.isArray(obj.widgets)) return null
    return obj as LedConfig
  } catch {
    return null
  }
}

/** Serializes board + widgets to a JSON string. */
export function serializeConfig(board: Board, widgets: Widget[]): string {
  const config: LedConfig = { version: '1.0', board, widgets }
  return JSON.stringify(config, null, 2)
}

/** Triggers a browser download of the config as a .ledjson file. */
export function exportConfig(board: Board, widgets: Widget[]): void {
  const content = serializeConfig(board, widgets)
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

- [ ] **Step 4: Create `src/utils/imageToPattern.ts`**

```typescript
/**
 * Converts an image File to a boolean[][] dot matrix.
 * @param file   Image file (PNG, JPG, etc.)
 * @param cols   Target dot columns (widget.width)
 * @param rows   Target dot rows (widget.height)
 * @param threshold  Grayscale threshold 0–255; pixels darker than this become lit (true)
 */
export async function imageToPattern(
  file: File,
  cols: number,
  rows: number,
  threshold: number
): Promise<boolean[][]> {
  const bitmap = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(cols, rows)
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(bitmap, 0, 0, cols, rows)
  bitmap.close()

  const imageData = ctx.getImageData(0, 0, cols, rows)
  const dots: boolean[][] = []

  for (let row = 0; row < rows; row++) {
    const rowArr: boolean[] = []
    for (let col = 0; col < cols; col++) {
      const i = (row * cols + col) * 4
      const r = imageData.data[i]
      const g = imageData.data[i + 1]
      const b = imageData.data[i + 2]
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      rowArr.push(gray < threshold)
    }
    dots.push(rowArr)
  }

  return dots
}
```

- [ ] **Step 5: Run — expect pass**

```bash
npm test -- --run src/utils/
```

Expected: `6 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/utils/
git commit -m "feat: add configIO and imageToPattern utilities"
```

---

### Task 9: Shared UI Components — ColorPicker & FontSelector

**Files:**
- Create: `src/components/ColorPicker.tsx`
- Create: `src/components/FontSelector.tsx`

**Interfaces:**
- Produces:
  - `<ColorPicker value={string} onChange={(color: string) => void} />`
  - `<FontSelector value={string} onChange={(font: string) => void} />`

- [ ] **Step 1: Create `src/components/ColorPicker.tsx`**

```tsx
type Props = {
  value: string
  onChange: (color: string) => void
}

const PRESET_COLORS = [
  { label: '红', value: '#ff0000' },
  { label: '绿', value: '#00ff00' },
  { label: '蓝', value: '#0000ff' },
  { label: '黄', value: '#ffff00' },
  { label: '白', value: '#ffffff' },
  { label: '橙', value: '#ff8800' },
  { label: '青', value: '#00ffff' },
  { label: '紫', value: '#ff00ff' },
]

export default function ColorPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PRESET_COLORS.map((c) => (
          <button
            key={c.value}
            title={c.label}
            onClick={() => onChange(c.value)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              backgroundColor: c.value,
              border: value === c.value ? '3px solid #fff' : '2px solid #444',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 36, height: 28, padding: 0, border: 'none', cursor: 'pointer', borderRadius: 4 }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
          }}
          style={{
            width: 90,
            background: '#222',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 4,
            padding: '4px 8px',
            fontFamily: 'monospace',
            fontSize: 13,
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/FontSelector.tsx`**

```tsx
type Props = {
  value: string
  onChange: (font: string) => void
}

const PIXEL_FONTS = ['Press Start 2P', 'Silkscreen', 'VT323']
const SYSTEM_FONTS = ['Arial', 'Georgia', 'Courier New', 'SimHei']

export default function FontSelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: '#222',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: 4,
        padding: '4px 8px',
        fontSize: 13,
        width: '100%',
      }}
    >
      <optgroup label="像素字体">
        {PIXEL_FONTS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </optgroup>
      <optgroup label="系统字体">
        {SYSTEM_FONTS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </optgroup>
    </select>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ColorPicker.tsx src/components/FontSelector.tsx
git commit -m "feat: add ColorPicker and FontSelector components"
```

---

### Task 10: PatternEditor Component

**Files:**
- Create: `src/components/PatternEditor.tsx`

**Interfaces:**
- Consumes: `imageToPattern` from `../utils/imageToPattern`
- Produces: `<PatternEditor dots={boolean[][]} onChange={(dots: boolean[][]) => void} />`

- [ ] **Step 1: Create `src/components/PatternEditor.tsx`**

```tsx
import { useRef, useEffect, useCallback } from 'react'
import { imageToPattern } from '../utils/imageToPattern'

type Props = {
  dots: boolean[][]
  onChange: (dots: boolean[][]) => void
}

const CELL_SIZE = 12

export default function PatternEditor({ dots, onChange }: Props) {
  const rows = dots.length
  const cols = dots[0]?.length ?? 0
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const drawModeRef = useRef<boolean>(true) // true = light, false = erase
  const thresholdRef = useRef(128)

  // Draw the grid
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = dots[r][c] ? '#ffffff' : '#1a1a1a'
        ctx.fillRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
      }
    }

    // Grid lines
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * CELL_SIZE)
      ctx.lineTo(cols * CELL_SIZE, r * CELL_SIZE)
      ctx.stroke()
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath()
      ctx.moveTo(c * CELL_SIZE, 0)
      ctx.lineTo(c * CELL_SIZE, rows * CELL_SIZE)
      ctx.stroke()
    }
  }, [dots, rows, cols])

  useEffect(() => { redraw() }, [redraw])

  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / CELL_SIZE)
    const row = Math.floor((e.clientY - rect.top) / CELL_SIZE)
    return { row, col }
  }

  const toggleCell = (row: number, col: number, lit: boolean) => {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return
    if (dots[row][col] === lit) return
    const next = dots.map((r, ri) => r.map((v, ci) => (ri === row && ci === col ? lit : v)))
    onChange(next)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    drawModeRef.current = e.button !== 2 // right click = erase
    const { row, col } = getCellFromEvent(e)
    toggleCell(row, col, drawModeRef.current)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const { row, col } = getCellFromEvent(e)
    toggleCell(row, col, drawModeRef.current)
  }

  const handleMouseUp = () => { isDrawingRef.current = false }

  const handleClear = () => {
    onChange(Array.from({ length: rows }, () => Array<boolean>(cols).fill(false)))
  }

  const handleInvert = () => {
    onChange(dots.map((r) => r.map((v) => !v)))
  }

  const handleImageImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const newDots = await imageToPattern(file, cols, rows, thresholdRef.current)
    onChange(newDots)
    e.target.value = ''
  }

  const buttonStyle: React.CSSProperties = {
    background: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ overflow: 'auto', maxWidth: 480, maxHeight: 320 }}>
        <canvas
          ref={canvasRef}
          width={cols * CELL_SIZE}
          height={rows * CELL_SIZE}
          style={{ cursor: 'crosshair', display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={buttonStyle} onClick={handleClear}>清除</button>
        <button style={buttonStyle} onClick={handleInvert}>反转</button>
        <label style={{ ...buttonStyle, display: 'inline-block' }}>
          导入图片
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageImport}
          />
        </label>
        <label style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6 }}>
          阈值
          <input
            type="range"
            min={0}
            max={255}
            defaultValue={128}
            onChange={(e) => { thresholdRef.current = Number(e.target.value) }}
            style={{ width: 80 }}
          />
        </label>
      </div>
      <p style={{ fontSize: 11, color: '#666', margin: 0 }}>左键绘制 · 右键擦除</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PatternEditor.tsx
git commit -m "feat: add PatternEditor component with draw/erase/image import"
```

---

### Task 11: PropertyPanel Component

**Files:**
- Create: `src/components/PropertyPanel.tsx`

**Interfaces:**
- Consumes: `useLedStore`, `ColorPicker`, `FontSelector`, `PatternEditor`, `Widget`, `Board`
- Produces: `<PropertyPanel />` — renders board settings when no widget selected; widget-specific form otherwise

- [ ] **Step 1: Create `src/components/PropertyPanel.tsx`**

```tsx
import { useLedStore } from '../store/useLedStore'
import ColorPicker from './ColorPicker'
import FontSelector from './FontSelector'
import PatternEditor from './PatternEditor'
import type { Board, DateTimeWidget, ClockWidget, ScrollTextWidget, PatternWidget, Widget } from '../types'

const labelStyle: React.CSSProperties = { fontSize: 12, color: '#aaa', marginBottom: 2, display: 'block' }
const inputStyle: React.CSSProperties = {
  background: '#222', color: '#fff', border: '1px solid #444',
  borderRadius: 4, padding: '4px 8px', fontSize: 13, width: '100%', boxSizing: 'border-box',
}
const sectionStyle: React.CSSProperties = { marginBottom: 16 }

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div style={sectionStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        style={inputStyle}
      />
    </div>
  )
}

function BoardPanel({ board, setBoard }: { board: Board; setBoard: (p: Partial<Board>) => void }) {
  return (
    <div>
      <h3 style={{ color: '#fff', fontSize: 14, marginTop: 0 }}>全局设置</h3>
      <NumberInput label="点阵宽度（列数）" value={board.width} min={8} max={256} onChange={(v) => setBoard({ width: v })} />
      <NumberInput label="点阵高度（行数）" value={board.height} min={8} max={128} onChange={(v) => setBoard({ height: v })} />
      <NumberInput label="点大小（px）" value={board.dotSize} min={2} max={32} onChange={(v) => setBoard({ dotSize: v })} />
      <NumberInput label="点间距（px）" value={board.dotGap} min={0} max={16} onChange={(v) => setBoard({ dotGap: v })} />
      <div style={sectionStyle}>
        <label style={labelStyle}>渲染模式</label>
        <select
          value={board.renderMode}
          onChange={(e) => setBoard({ renderMode: e.target.value as Board['renderMode'] })}
          style={inputStyle}
        >
          <option value="realistic">写实（发光）</option>
          <option value="clean">简洁（无光晕）</option>
        </select>
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>背景颜色</label>
        <ColorPicker value={board.backgroundColor} onChange={(c) => setBoard({ backgroundColor: c })} />
      </div>
    </div>
  )
}

function CommonFields({ widget, update }: { widget: Widget; update: (p: Partial<Widget>) => void }) {
  return (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>颜色</label>
        <ColorPicker value={widget.color} onChange={(c) => update({ color: c })} />
      </div>
      <NumberInput label="X（列，点）" value={widget.x} min={0} onChange={(v) => update({ x: v })} />
      <NumberInput label="Y（行，点）" value={widget.y} min={0} onChange={(v) => update({ y: v })} />
      <NumberInput label="宽度（点）" value={widget.width} min={1} onChange={(v) => update({ width: v })} />
      <NumberInput label="高度（点）" value={widget.height} min={1} onChange={(v) => update({ height: v })} />
      <NumberInput label="层级（zIndex）" value={widget.zIndex} onChange={(v) => update({ zIndex: v })} />
    </>
  )
}

function DateTimePanel({ widget, update }: { widget: DateTimeWidget; update: (p: Partial<Widget>) => void }) {
  return (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>时间格式（dayjs）</label>
        <input type="text" value={widget.format} onChange={(e) => update({ format: e.target.value } as any)} style={inputStyle} />
        <span style={{ fontSize: 11, color: '#666' }}>如 HH:mm:ss · YYYY-MM-DD · dddd</span>
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>字体</label>
        <FontSelector value={widget.font} onChange={(f) => update({ font: f } as any)} />
      </div>
      <NumberInput label="字号（px）" value={widget.fontSize} min={6} max={256} onChange={(v) => update({ fontSize: v } as any)} />
      <CommonFields widget={widget} update={update} />
    </>
  )
}

function ClockPanel({ widget, update }: { widget: ClockWidget; update: (p: Partial<Widget>) => void }) {
  return (
    <>
      <div style={sectionStyle}>
        <label style={{ ...labelStyle, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={widget.showSecondHand}
            onChange={(e) => update({ showSecondHand: e.target.checked } as any)}
          />
          显示秒针
        </label>
      </div>
      <CommonFields widget={widget} update={update} />
    </>
  )
}

function ScrollTextPanel({ widget, update }: { widget: ScrollTextWidget; update: (p: Partial<Widget>) => void }) {
  const updateItems = (items: string[]) => update({ items } as any)

  return (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>滚动文字列表（每行一条）</label>
        <textarea
          value={widget.items.join('\n')}
          onChange={(e) => updateItems(e.target.value.split('\n'))}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
        />
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>滚动方向</label>
        <select value={widget.direction} onChange={(e) => update({ direction: e.target.value as any } as any)} style={inputStyle}>
          <option value="left">← 向左</option>
          <option value="right">→ 向右</option>
          <option value="up">↑ 向上</option>
          <option value="down">↓ 向下</option>
        </select>
      </div>
      <NumberInput label="速度（px/s）" value={widget.speed} min={10} max={500} onChange={(v) => update({ speed: v } as any)} />
      <NumberInput label="停顿时长（ms）" value={widget.pauseMs} min={0} max={10000} onChange={(v) => update({ pauseMs: v } as any)} />
      <div style={sectionStyle}>
        <label style={labelStyle}>字体</label>
        <FontSelector value={widget.font} onChange={(f) => update({ font: f } as any)} />
      </div>
      <NumberInput label="字号（px）" value={widget.fontSize} min={6} max={256} onChange={(v) => update({ fontSize: v } as any)} />
      <CommonFields widget={widget} update={update} />
    </>
  )
}

function PatternPanel({ widget, update }: { widget: PatternWidget; update: (p: Partial<Widget>) => void }) {
  return (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>点阵绘制</label>
        <PatternEditor dots={widget.dots} onChange={(dots) => update({ dots } as any)} />
      </div>
      <CommonFields widget={widget} update={update} />
    </>
  )
}

export default function PropertyPanel() {
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)
  const selectedId = useLedStore((s) => s.selectedId)
  const setBoard = useLedStore((s) => s.setBoard)
  const updateWidget = useLedStore((s) => s.updateWidget)

  const selected = widgets.find((w) => w.id === selectedId)
  const update = (patch: Partial<Widget>) => {
    if (selected) updateWidget(selected.id, patch)
  }

  const panelStyle: React.CSSProperties = {
    padding: 16,
    overflowY: 'auto',
    height: '100%',
    boxSizing: 'border-box',
    color: '#fff',
  }

  if (!selected) {
    return (
      <div style={panelStyle}>
        <BoardPanel board={board} setBoard={setBoard} />
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      <h3 style={{ color: '#fff', fontSize: 14, marginTop: 0 }}>
        {selected.type === 'datetime' && '日期时间'}
        {selected.type === 'clock' && '模拟时钟'}
        {selected.type === 'scrolltext' && '滚动文字'}
        {selected.type === 'pattern' && '自定义图案'}
      </h3>
      {selected.type === 'datetime' && <DateTimePanel widget={selected as DateTimeWidget} update={update} />}
      {selected.type === 'clock' && <ClockPanel widget={selected as ClockWidget} update={update} />}
      {selected.type === 'scrolltext' && <ScrollTextPanel widget={selected as ScrollTextWidget} update={update} />}
      {selected.type === 'pattern' && <PatternPanel widget={selected as PatternWidget} update={update} />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PropertyPanel.tsx
git commit -m "feat: add PropertyPanel with forms for all widget types and board settings"
```

---

### Task 12: WidgetList Component

**Files:**
- Create: `src/components/WidgetList.tsx`

**Interfaces:**
- Consumes: `useLedStore`, `WidgetType`
- Produces: `<WidgetList />` — left panel showing widget entries with add/delete/visibility/select

- [ ] **Step 1: Create `src/components/WidgetList.tsx`**

```tsx
import { useLedStore } from '../store/useLedStore'
import type { Widget, WidgetType } from '../types'

const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  datetime: '⏱ 日期时间',
  clock: '🕐 模拟时钟',
  scrolltext: '📜 滚动文字',
  pattern: '🎨 自定义图案',
}

const ADD_TYPES: WidgetType[] = ['datetime', 'clock', 'scrolltext', 'pattern']

export default function WidgetList() {
  const widgets = useLedStore((s) => s.widgets)
  const selectedId = useLedStore((s) => s.selectedId)
  const addWidget = useLedStore((s) => s.addWidget)
  const removeWidget = useLedStore((s) => s.removeWidget)
  const updateWidget = useLedStore((s) => s.updateWidget)
  const selectWidget = useLedStore((s) => s.selectWidget)

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#111',
    borderRight: '1px solid #333',
  }

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #333',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
  }

  const addSection: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  }

  const addBtnStyle: React.CSSProperties = {
    background: '#1e3a5f',
    color: '#7ec8ff',
    border: '1px solid #2a5a8f',
    borderRadius: 4,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 11,
  }

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
  }

  const itemStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    gap: 8,
    cursor: 'pointer',
    background: selected ? '#1a2a3a' : 'transparent',
    borderBottom: '1px solid #1a1a1a',
    color: '#ddd',
    fontSize: 12,
  })

  const iconBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    fontSize: 14,
    lineHeight: 1,
    color: '#888',
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>部件列表</div>

      <div style={addSection}>
        {ADD_TYPES.map((type) => (
          <button key={type} style={addBtnStyle} onClick={() => addWidget(type)}>
            + {type === 'datetime' ? '时间' : type === 'clock' ? '时钟' : type === 'scrolltext' ? '文字' : '图案'}
          </button>
        ))}
      </div>

      <div style={listStyle}>
        {widgets.length === 0 && (
          <p style={{ color: '#555', fontSize: 12, padding: '16px 12px', textAlign: 'center' }}>
            点击上方按钮添加部件
          </p>
        )}
        {[...widgets].reverse().map((w: Widget) => (
          <div
            key={w.id}
            style={itemStyle(w.id === selectedId)}
            onClick={() => selectWidget(w.id === selectedId ? null : w.id)}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {WIDGET_TYPE_LABELS[w.type]}
            </span>
            <button
              style={{ ...iconBtnStyle, color: w.visible ? '#7ec8ff' : '#555' }}
              title={w.visible ? '隐藏' : '显示'}
              onClick={(e) => { e.stopPropagation(); updateWidget(w.id, { visible: !w.visible }) }}
            >
              {w.visible ? '👁' : '🚫'}
            </button>
            <button
              style={{ ...iconBtnStyle, color: '#ff6666' }}
              title="删除"
              onClick={(e) => { e.stopPropagation(); removeWidget(w.id) }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WidgetList.tsx
git commit -m "feat: add WidgetList component with add/remove/visibility/select"
```

---

### Task 13: DragLayer + ConfigPage Assembly

**Files:**
- Create: `src/components/DragLayer.tsx`
- Modify: `src/pages/ConfigPage.tsx`

**Interfaces:**
- Consumes: `useLedStore`, `LedCanvas`, `WidgetList`, `PropertyPanel`, `react-draggable`; `importConfig`, `exportConfig` from `../utils/configIO`
- Produces: Three-column ConfigPage with working drag, preview, and import/export

- [ ] **Step 1: Create `src/components/DragLayer.tsx`**

```tsx
import Draggable from 'react-draggable'
import { useLedStore } from '../store/useLedStore'
import type { Widget } from '../types'

type Props = {
  /** Visual scale: previewPixels / actualCanvasPixels */
  scale: number
}

export default function DragLayer({ scale }: Props) {
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)
  const selectedId = useLedStore((s) => s.selectedId)
  const updateWidget = useLedStore((s) => s.updateWidget)
  const selectWidget = useLedStore((s) => s.selectWidget)

  const step = board.dotSize + board.dotGap

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: board.width * step * scale,
        height: board.height * step * scale,
        pointerEvents: 'none',
      }}
    >
      {widgets
        .filter((w) => w.visible)
        .map((w: Widget) => {
          const x = w.x * step * scale
          const y = w.y * step * scale
          const width = w.width * step * scale
          const height = w.height * step * scale
          const isSelected = w.id === selectedId

          return (
            <Draggable
              key={w.id}
              position={{ x, y }}
              onStop={(_e, data) => {
                const dotX = Math.max(0, Math.round(data.x / scale / step))
                const dotY = Math.max(0, Math.round(data.y / scale / step))
                updateWidget(w.id, { x: dotX, y: dotY })
              }}
              bounds="parent"
            >
              <div
                style={{
                  position: 'absolute',
                  width,
                  height,
                  border: isSelected ? '2px solid #7ec8ff' : '1px dashed rgba(255,255,255,0.25)',
                  boxSizing: 'border-box',
                  cursor: 'move',
                  pointerEvents: 'all',
                }}
                onClick={() => selectWidget(w.id === selectedId ? null : w.id)}
              >
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -18,
                      left: 0,
                      background: '#1e3a5f',
                      color: '#7ec8ff',
                      fontSize: 10,
                      padding: '1px 4px',
                      borderRadius: 3,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {w.type} ({w.x},{w.y})
                  </div>
                )}
              </div>
            </Draggable>
          )
        })}
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/pages/ConfigPage.tsx`**

```tsx
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLedStore } from '../store/useLedStore'
import LedCanvas from '../components/LedCanvas'
import DragLayer from '../components/DragLayer'
import WidgetList from '../components/WidgetList'
import PropertyPanel from '../components/PropertyPanel'
import { exportConfig, importConfig } from '../utils/configIO'

const PREVIEW_MAX_W = 640
const PREVIEW_MAX_H = 380

export default function ConfigPage() {
  const navigate = useNavigate()
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)
  const setConfig = useLedStore((s) => s.setConfig)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const step = board.dotSize + board.dotGap
  const actualW = board.width * step
  const actualH = board.height * step
  const scaleX = PREVIEW_MAX_W / actualW
  const scaleY = PREVIEW_MAX_H / actualH
  const scale = Math.min(scaleX, scaleY, 1)

  const handleExport = () => exportConfig(board, widgets)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const config = await importConfig(file)
    if (config) {
      setConfig({ board: config.board, widgets: config.widgets })
    } else {
      alert('配置文件格式无效，请检查文件内容。')
    }
    e.target.value = ''
  }

  const pageStyle: React.CSSProperties = {
    display: 'flex',
    height: '100vh',
    background: '#0a0a0a',
    overflow: 'hidden',
  }

  const leftStyle: React.CSSProperties = {
    width: 200,
    minWidth: 180,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  }

  const centerStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  }

  const rightStyle: React.CSSProperties = {
    width: 280,
    minWidth: 240,
    flexShrink: 0,
    borderLeft: '1px solid #333',
    overflowY: 'auto',
  }

  const topBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  }

  const btnStyle: React.CSSProperties = {
    background: '#1e3a5f',
    color: '#7ec8ff',
    border: '1px solid #2a5a8f',
    borderRadius: 5,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 12,
  }

  const previewWrapStyle: React.CSSProperties = {
    position: 'relative',
    width: actualW * scale,
    height: actualH * scale,
    flexShrink: 0,
    border: '1px solid #333',
  }

  return (
    <div style={pageStyle}>
      {/* Left: Widget List */}
      <div style={leftStyle}>
        <WidgetList />
      </div>

      {/* Center: Preview + toolbar */}
      <div style={centerStyle}>
        <div style={topBarStyle}>
          <button style={btnStyle} onClick={() => navigate('/')}>▶ 全屏展示</button>
          <button style={btnStyle} onClick={handleExport}>⬇ 导出配置</button>
          <label style={btnStyle}>
            ⬆ 导入配置
            <input
              ref={fileInputRef}
              type="file"
              accept=".ledjson,.json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </label>
        </div>

        <div style={previewWrapStyle}>
          <LedCanvas board={board} widgets={widgets} scale={scale} />
          <DragLayer scale={scale} />
        </div>

        <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
          拖动选框调整位置 · 点击选框选中部件 · 点击空白取消选中
        </p>
      </div>

      {/* Right: Properties */}
      <div style={rightStyle}>
        <PropertyPanel />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Visual test**

```bash
npm run dev
```

Open `http://localhost:5173/config`. Verify:
- Three-column layout renders without errors
- Clicking "+ 时间" in widget list adds a datetime widget to the preview
- Clicking a widget frame selects it and shows its properties in the right panel
- Dragging a widget frame updates its position
- "导出配置" downloads a `.ledjson` file
- Importing that file restores the same layout
- "▶ 全屏展示" navigates to `/`

- [ ] **Step 4: Commit**

```bash
git add src/components/DragLayer.tsx src/pages/ConfigPage.tsx
git commit -m "feat: assemble ConfigPage with drag layer, import/export, and three-column layout"
```

---

### Task 14: Deploy Configuration

**Files:**
- Modify: `vite.config.ts` — add `base` for GitHub Pages
- Create: `README.md`
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: `npm run build` outputs to `dist/`; GitHub Actions auto-deploys to GitHub Pages on push to `main`

- [ ] **Step 1: Update `vite.config.ts` with base path**

Replace the file with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Set base to repo name for GitHub Pages; use '/' for custom domain
  base: command === 'build' ? '/led-screen/' : '/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
}))
```

- [ ] **Step 2: Update `src/main.tsx`** — wrap BrowserRouter with `basename`

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

const base = import.meta.env.BASE_URL

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={base}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 3: Create `README.md`**

```markdown
# LED Screen Simulator

在浏览器中模拟 LED 点阵灯牌显示效果。

## 功能

- 日期时间显示（支持自定义格式）
- 图形化模拟时钟（支持显示/隐藏秒针）
- 滚动文字（支持多条轮播、四方向滚动）
- 自定义点阵图案（鼠标绘制 + 图片导入）
- 写实发光 / 简洁像素 两种渲染模式
- 配置导入/导出（`.ledjson` 格式）

## 开发

```bash
npm install
npm run dev    # 开发服务器
npm test       # 运行测试
npm run build  # 生产构建
```

## 部署

推送到 `main` 分支自动部署至 GitHub Pages。
```

- [ ] **Step 4: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 5: Run full test suite and build**

```bash
npm test -- --run
```

Expected: all tests pass (≥ 14 test cases).

```bash
npm run build
```

Expected: `dist/` folder created with no errors. Output shows bundle sizes.

- [ ] **Step 6: Final commit**

```bash
git add vite.config.ts src/main.tsx README.md .github/
git commit -m "feat: add GitHub Pages deploy config and README"
```

- [ ] **Step 7: Enable GitHub Pages in repo settings**

In the GitHub repository → Settings → Pages → Source: select **GitHub Actions**. Push to `main` to trigger first deploy.

---

## Self-Review Checklist

### Spec Coverage

| Spec Requirement | Covered in Task |
|---|---|
| 日期时间显示，支持自定义格式 | Task 4, 11 (DateTimeWidget + format input) |
| 图形化时钟，支持显示/隐藏秒针 | Task 5, 11 (ClockWidget + showSecondHand) |
| 滚动文字，内容列表可配置 | Task 5, 11 (ScrollTextWidget + items textarea) |
| 自定义静态图案（鼠标绘制 + 图片导入） | Task 4, 8, 10 (PatternWidget + PatternEditor + imageToPattern) |
| 点阵总尺寸可设置 | Task 2, 11 (Board.width/height + BoardPanel) |
| 每个部件颜色可自定义 | Task 9, 11 (ColorPicker) |
| LED 常见颜色组合预设 | Task 9 (8-color PRESET_COLORS) |
| 文本组件字体可设置 | Task 9, 11 (FontSelector) |
| 配置导入/导出 | Task 8, 13 (configIO + ConfigPage) |
| 可部署 Web 应用 | Task 1, 14 (Vite + GitHub Actions) |
| 写实/简洁双模式 | Task 3, 6 (drawLedDot + renderFrame) |
| 自由拖拽布局 | Task 13 (DragLayer + react-draggable) |
| 分离页面（展示/配置） | Task 7, 13 (DisplayPage + ConfigPage) |

All requirements covered. No gaps found.
