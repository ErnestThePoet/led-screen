# LED 点阵渲染性能优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过精灵图缓存和 Widget 光栅化缓存，将 200×100 点阵的渲染帧率显著提升。

**Architecture:** 新增 `dotSpriteCache.ts` 预渲染每种 LED 点状态为 `OffscreenCanvas` 并缓存，`drawLedDot` 改用 `ctx.drawImage()` 贴图替代 `arc+fill+shadowBlur`；新增 `rasterizeCache.ts` 对 pattern/clock/datetime 类 widget 的 `OffscreenCanvas` 跨帧复用，滚动文字仍每帧渲染；`LedCanvas.tsx` 在 board 参数变化时清空精灵缓存，并追踪 widget ID 以在删除时逐出光栅缓存。

**Tech Stack:** React 18, TypeScript, Canvas 2D API, OffscreenCanvas, Vitest, vitest-canvas-mock

## Global Constraints

- TypeScript strict mode（现有 tsconfig.json 已开启）
- 运行测试命令：`pnpm test`
- 所有新文件与现有代码风格一致（无分号、2 空格缩进）
- `drawLedDot` 对外签名不变：`(ctx, cx, cy, radius, color, lit, mode) => void`
- `renderFrame` 对外签名不变

---

## 文件结构速览

| 操作 | 文件 |
|---|---|
| **新建** | `src/renderer/dotSpriteCache.ts` |
| **新建** | `src/renderer/dotSpriteCache.test.ts` |
| **修改** | `src/renderer/drawLedDot.ts` |
| **修改** | `src/renderer/drawLedDot.test.ts` |
| **新建** | `src/renderer/rasterize/rasterizeCache.ts` |
| **新建** | `src/renderer/rasterize/rasterizeCache.test.ts` |
| **修改** | `src/renderer/renderFrame.ts` |
| **修改** | `src/components/LedCanvas.tsx` |

---

## Task 1: dotSpriteCache — 精灵图缓存模块

**Files:**
- Create: `src/renderer/dotSpriteCache.ts`
- Create: `src/renderer/dotSpriteCache.test.ts`

**Interfaces:**
- Produces:
  ```ts
  getDotSprite(color: string, dotSize: number, mode: RenderMode): OffscreenCanvas | null
  clearDotSpriteCache(): void
  ```

- [ ] **Step 1: 写失败的测试**

  新建 `src/renderer/dotSpriteCache.test.ts`，内容如下：

  ```ts
  import { describe, it, expect, beforeEach } from 'vitest'
  import { getDotSprite, clearDotSpriteCache } from './dotSpriteCache'

  describe('dotSpriteCache', () => {
    beforeEach(() => {
      clearDotSpriteCache()
    })

    it('returns null for dotSize <= 0', () => {
      expect(getDotSprite('#ff0000', 0, 'clean')).toBeNull()
      expect(getDotSprite('#ff0000', -1, 'clean')).toBeNull()
    })

    it('returns an OffscreenCanvas for valid inputs', () => {
      const sprite = getDotSprite('#ff0000', 8, 'clean')
      expect(sprite).toBeInstanceOf(OffscreenCanvas)
    })

    it('returns the same instance on repeated calls (cache hit)', () => {
      const a = getDotSprite('#ff0000', 8, 'clean')
      const b = getDotSprite('#ff0000', 8, 'clean')
      expect(a).toBe(b)
    })

    it('returns different instances for different colors', () => {
      const a = getDotSprite('#ff0000', 8, 'clean')
      const b = getDotSprite('#00ff00', 8, 'clean')
      expect(a).not.toBe(b)
    })

    it('returns different instances for different modes', () => {
      const a = getDotSprite('#ff0000', 8, 'clean')
      const b = getDotSprite('#ff0000', 8, 'realistic')
      expect(a).not.toBe(b)
    })

    it('returns different instances for different dotSizes', () => {
      const a = getDotSprite('#ff0000', 8, 'clean')
      const b = getDotSprite('#ff0000', 10, 'clean')
      expect(a).not.toBe(b)
    })

    it('clearDotSpriteCache causes a new instance to be built', () => {
      const a = getDotSprite('#ff0000', 8, 'clean')
      clearDotSpriteCache()
      const b = getDotSprite('#ff0000', 8, 'clean')
      expect(a).not.toBe(b)
    })

    it('sprite dimensions are dotSize*3 × dotSize*3', () => {
      const dotSize = 8
      const sprite = getDotSprite('#ff0000', dotSize, 'clean')!
      expect(sprite.width).toBe(dotSize * 3)
      expect(sprite.height).toBe(dotSize * 3)
    })
  })
  ```

- [ ] **Step 2: 确认测试失败**

  ```bash
  pnpm test -- dotSpriteCache
  ```

  预期：`Cannot find module './dotSpriteCache'`

- [ ] **Step 3: 实现 dotSpriteCache.ts**

  新建 `src/renderer/dotSpriteCache.ts`，内容如下：

  ```ts
  import type { RenderMode } from '../types'

  const spriteCache = new Map<string, OffscreenCanvas>()

  function spriteKey(color: string, dotSize: number, mode: RenderMode): string {
    return `${dotSize}:${color}:${mode}`
  }

  function buildSprite(color: string, dotSize: number, mode: RenderMode): OffscreenCanvas {
    const size = dotSize * 3
    const canvas = new OffscreenCanvas(size, size)
    const ctx = canvas.getContext('2d')!
    const cx = size / 2
    const cy = size / 2
    const radius = dotSize / 2

    if (mode === 'clean') {
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    } else {
      // Outer glow: semi-transparent large circle (replaces shadowBlur)
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2)
      ctx.fillStyle = color + '33'
      ctx.fill()
      // Inner dot: radial gradient
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.4, color)
      grad.addColorStop(1, color + '88')
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    return canvas
  }

  export function getDotSprite(
    color: string,
    dotSize: number,
    mode: RenderMode
  ): OffscreenCanvas | null {
    if (dotSize <= 0) return null
    const key = spriteKey(color, dotSize, mode)
    let sprite = spriteCache.get(key)
    if (!sprite) {
      sprite = buildSprite(color, dotSize, mode)
      spriteCache.set(key, sprite)
    }
    return sprite
  }

  export function clearDotSpriteCache(): void {
    spriteCache.clear()
  }
  ```

- [ ] **Step 4: 确认测试通过**

  ```bash
  pnpm test -- dotSpriteCache
  ```

  预期：8 tests passed

- [ ] **Step 5: 提交**

  ```bash
  git add src/renderer/dotSpriteCache.ts src/renderer/dotSpriteCache.test.ts
  git commit -m "feat: add dot sprite cache to eliminate per-dot arc/fill/shadowBlur"
  ```

---

## Task 2: drawLedDot — 改用精灵图绘制亮点

**Files:**
- Modify: `src/renderer/drawLedDot.ts`
- Modify: `src/renderer/drawLedDot.test.ts`

**Interfaces:**
- Consumes: `getDotSprite(color, dotSize, mode)` from `./dotSpriteCache`
- Produces: 对外签名不变 `drawLedDot(ctx, cx, cy, radius, color, lit, mode): void`

- [ ] **Step 1: 更新测试以匹配新行为**

  用以下内容**完整替换** `src/renderer/drawLedDot.test.ts`：

  ```ts
  import { describe, it, expect, beforeEach } from 'vitest'
  import { drawLedDot } from './drawLedDot'
  import { clearDotSpriteCache } from './dotSpriteCache'

  describe('drawLedDot', () => {
    let canvas: HTMLCanvasElement
    let ctx: CanvasRenderingContext2D

    beforeEach(() => {
      clearDotSpriteCache()
      canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      ctx = canvas.getContext('2d')!
    })

    it('sets fillStyle to dim color when not lit', () => {
      drawLedDot(ctx, 50, 50, 4, '#ff0000', false, 'clean')
      expect(ctx.fillStyle).toBe('#1a1a1a')
    })

    it('calls arc for unlit dot', () => {
      drawLedDot(ctx, 50, 50, 4, '#ffffff', false, 'clean')
      expect(ctx.arc).toHaveBeenCalledWith(50, 50, 4, 0, Math.PI * 2)
    })

    it('calls drawImage (sprite) when lit in clean mode', () => {
      drawLedDot(ctx, 50, 50, 4, '#00ff00', true, 'clean')
      expect(ctx.drawImage).toHaveBeenCalled()
    })

    it('calls drawImage (sprite) when lit in realistic mode', () => {
      drawLedDot(ctx, 50, 50, 4, '#ff0000', true, 'realistic')
      expect(ctx.drawImage).toHaveBeenCalled()
    })

    it('does not set shadowBlur for lit dot', () => {
      drawLedDot(ctx, 50, 50, 4, '#ff0000', true, 'realistic')
      // shadowBlur must never be set; default is 0
      expect(ctx.shadowBlur).toBe(0)
    })

    it('drawImage is centered on (cx, cy) with size dotSize*3', () => {
      const cx = 50, cy = 50, radius = 4
      const dotSize = radius * 2  // 8
      drawLedDot(ctx, cx, cy, radius, '#ff0000', true, 'clean')
      // Expected call: ctx.drawImage(sprite, cx - radius*3, cy - radius*3, dotSize*3, dotSize*3)
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),        // the sprite canvas
        cx - radius * 3,          // x = 50 - 12 = 38
        cy - radius * 3,          // y = 50 - 12 = 38
        dotSize * 3,              // w = 24
        dotSize * 3               // h = 24
      )
    })
  })
  ```

- [ ] **Step 2: 确认测试失败（行为不匹配旧实现）**

  ```bash
  pnpm test -- drawLedDot
  ```

  预期：`calls drawImage` 相关测试 FAIL，`sets fillStyle to widget color when lit` 测试已被替换

- [ ] **Step 3: 更新 drawLedDot.ts 实现**

  用以下内容**完整替换** `src/renderer/drawLedDot.ts`：

  ```ts
  import type { RenderMode } from '../types'
  import { getDotSprite } from './dotSpriteCache'

  export function drawLedDot(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: string,
    lit: boolean,
    mode: RenderMode
  ): void {
    if (!lit) {
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#1a1a1a'
      ctx.fill()
      return
    }

    const dotSize = radius * 2
    const sprite = getDotSprite(color, dotSize, mode)
    if (sprite) {
      // Fast path: one GPU texture sample, no path/shadow/gradient overhead
      ctx.drawImage(sprite, cx - radius * 3, cy - radius * 3, dotSize * 3, dotSize * 3)
      return
    }

    // Fallback: only reached when dotSize <= 0 (getDotSprite guard)
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }
  ```

- [ ] **Step 4: 确认所有测试通过**

  ```bash
  pnpm test -- drawLedDot
  ```

  预期：6 tests passed

- [ ] **Step 5: 提交**

  ```bash
  git add src/renderer/drawLedDot.ts src/renderer/drawLedDot.test.ts
  git commit -m "feat: drawLedDot uses sprite cache via drawImage, eliminates shadowBlur"
  ```

---

## Task 3: rasterizeCache — Widget 光栅化缓存模块

**Files:**
- Create: `src/renderer/rasterize/rasterizeCache.ts`
- Create: `src/renderer/rasterize/rasterizeCache.test.ts`

**Interfaces:**
- Consumes: `rasterizePattern`, `rasterizeDateTime`, `rasterizeClock`, `rasterizeScrollText`（现有函数，签名不变）
- Produces:
  ```ts
  getCachedRaster(
    widget: Widget,
    dotSize: number,
    scrollStates: Map<string, ScrollState>,
    deltaMs: number
  ): OffscreenCanvas | null

  evictWidgetCache(widgetId: string): void
  ```

- [ ] **Step 1: 写失败的测试**

  新建 `src/renderer/rasterize/rasterizeCache.test.ts`，内容如下：

  ```ts
  import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
  import { getCachedRaster, evictWidgetCache } from './rasterizeCache'
  import type { PatternWidget, ClockWidget, DateTimeWidget, ScrollTextWidget } from '../../types'
  import type { ScrollState } from './rasterizeScrollText'

  function makePattern(id: string, dots?: boolean[][]): PatternWidget {
    return {
      id,
      type: 'pattern',
      x: 0, y: 0, width: 4, height: 4,
      color: '#ff0000',
      visible: true,
      zIndex: 0,
      dots: dots ?? Array.from({ length: 4 }, () => Array<boolean>(4).fill(false)),
    }
  }

  function makeClock(id: string, showSecondHand = true): ClockWidget {
    return {
      id,
      type: 'clock',
      x: 0, y: 0, width: 16, height: 16,
      color: '#ffffff',
      visible: true,
      zIndex: 0,
      showSecondHand,
    }
  }

  function makeScrollText(id: string): ScrollTextWidget {
    return {
      id,
      type: 'scrolltext',
      x: 0, y: 0, width: 32, height: 8,
      color: '#00ff00',
      visible: true,
      zIndex: 0,
      items: ['hello'],
      speed: 60,
      direction: 'left',
      font: 'monospace',
      fontSize: 8,
      pauseMs: 0,
    }
  }

  describe('rasterizeCache', () => {
    const scrollStates = new Map<string, ScrollState>()

    beforeEach(() => {
      evictWidgetCache('w1')
      evictWidgetCache('w2')
      scrollStates.clear()
    })

    describe('pattern', () => {
      it('returns an OffscreenCanvas', () => {
        const result = getCachedRaster(makePattern('w1'), 4, scrollStates, 16)
        expect(result).toBeInstanceOf(OffscreenCanvas)
      })

      it('returns the same canvas instance on repeated calls with same dots', () => {
        const dots = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false))
        const a = getCachedRaster(makePattern('w1', dots), 4, scrollStates, 16)
        const b = getCachedRaster(makePattern('w1', dots), 4, scrollStates, 16)
        expect(a).toBe(b)
      })

      it('returns a new canvas instance when dots content changes', () => {
        const dots1 = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false))
        const dots2 = Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 4 }, (_, c) => r === 0 && c === 0)
        )
        const a = getCachedRaster(makePattern('w1', dots1), 4, scrollStates, 16)
        const b = getCachedRaster(makePattern('w1', dots2), 4, scrollStates, 16)
        expect(a).not.toBe(b)
      })
    })

    describe('clock', () => {
      beforeEach(() => { vi.useFakeTimers() })
      afterEach(() => { vi.useRealTimers() })

      it('returns the same canvas within the same second (showSecondHand=true)', () => {
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
        const a = getCachedRaster(makeClock('w1', true), 4, scrollStates, 16)
        const b = getCachedRaster(makeClock('w1', true), 4, scrollStates, 16)
        expect(a).toBe(b)
      })

      it('returns a new canvas after a second elapses (showSecondHand=true)', () => {
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
        const a = getCachedRaster(makeClock('w1', true), 4, scrollStates, 16)
        vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z'))
        const b = getCachedRaster(makeClock('w1', true), 4, scrollStates, 16)
        expect(a).not.toBe(b)
      })

      it('does not re-render within the same minute (showSecondHand=false)', () => {
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
        const a = getCachedRaster(makeClock('w1', false), 4, scrollStates, 16)
        vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'))
        const b = getCachedRaster(makeClock('w1', false), 4, scrollStates, 16)
        expect(a).toBe(b)
      })
    })

    describe('scrolltext', () => {
      it('returns a new OffscreenCanvas on every call (no caching)', () => {
        const a = getCachedRaster(makeScrollText('w1'), 4, scrollStates, 16)
        const b = getCachedRaster(makeScrollText('w1'), 4, scrollStates, 16)
        expect(a).not.toBe(b)
      })
    })

    describe('evictWidgetCache', () => {
      it('removes the cached entry so next call rebuilds', () => {
        const dots = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false))
        const a = getCachedRaster(makePattern('w1', dots), 4, scrollStates, 16)
        evictWidgetCache('w1')
        const b = getCachedRaster(makePattern('w1', dots), 4, scrollStates, 16)
        expect(a).not.toBe(b)
      })

      it('is a no-op for unknown widget IDs', () => {
        expect(() => evictWidgetCache('nonexistent')).not.toThrow()
      })
    })
  })
  ```

- [ ] **Step 2: 确认测试失败**

  ```bash
  pnpm test -- rasterizeCache
  ```

  预期：`Cannot find module './rasterizeCache'`

- [ ] **Step 3: 实现 rasterizeCache.ts**

  新建 `src/renderer/rasterize/rasterizeCache.ts`，内容如下：

  ```ts
  import type { Widget, PatternWidget, DateTimeWidget, ClockWidget, ScrollTextWidget } from '../../types'
  import type { ScrollState } from './rasterizeScrollText'
  import { rasterizePattern } from './rasterizePattern'
  import { rasterizeDateTime } from './rasterizeDateTime'
  import { rasterizeClock } from './rasterizeClock'
  import { rasterizeScrollText } from './rasterizeScrollText'

  type CacheEntry = {
    canvas: OffscreenCanvas
    key: string
  }

  const widgetCache = new Map<string, CacheEntry>()

  function patternKey(widget: PatternWidget): string {
    return JSON.stringify(widget.dots)
  }

  function dateTimeKey(widget: DateTimeWidget): string {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    const s = now.getSeconds()
    const includesSecs = widget.format.includes('s') || widget.format.includes('S')
    return includesSecs
      ? `${widget.format}:${h}:${m}:${s}`
      : `${widget.format}:${h}:${m}`
  }

  function clockKey(widget: ClockWidget): string {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    const s = now.getSeconds()
    return widget.showSecondHand ? `${h}:${m}:${s}` : `${h}:${m}`
  }

  function getOrBuild(
    widgetId: string,
    key: string,
    build: () => OffscreenCanvas
  ): OffscreenCanvas {
    const entry = widgetCache.get(widgetId)
    if (entry && entry.key === key) return entry.canvas
    const canvas = build()
    widgetCache.set(widgetId, { canvas, key })
    return canvas
  }

  export function getCachedRaster(
    widget: Widget,
    dotSize: number,
    scrollStates: Map<string, ScrollState>,
    deltaMs: number
  ): OffscreenCanvas | null {
    switch (widget.type) {
      case 'pattern':
        return getOrBuild(
          widget.id,
          patternKey(widget as PatternWidget),
          () => rasterizePattern(widget as PatternWidget, dotSize)
        )

      case 'datetime':
        return getOrBuild(
          widget.id,
          dateTimeKey(widget as DateTimeWidget),
          () => rasterizeDateTime(widget as DateTimeWidget, dotSize)
        )

      case 'clock':
        return getOrBuild(
          widget.id,
          clockKey(widget as ClockWidget),
          () => rasterizeClock(widget as ClockWidget, dotSize)
        )

      case 'scrolltext': {
        let state = scrollStates.get(widget.id)
        if (!state) {
          state = { itemIndex: 0, offset: 0, pauseRemaining: 0 }
          scrollStates.set(widget.id, state)
        }
        return rasterizeScrollText(widget as ScrollTextWidget, dotSize, state, deltaMs)
      }

      default:
        return null
    }
  }

  export function evictWidgetCache(widgetId: string): void {
    widgetCache.delete(widgetId)
  }
  ```

- [ ] **Step 4: 确认所有测试通过**

  ```bash
  pnpm test -- rasterizeCache
  ```

  预期：12 tests passed

- [ ] **Step 5: 提交**

  ```bash
  git add src/renderer/rasterize/rasterizeCache.ts src/renderer/rasterize/rasterizeCache.test.ts
  git commit -m "feat: add widget rasterization cache, skip re-render for static widgets"
  ```

---

## Task 4: 串联接入 — renderFrame + LedCanvas

**Files:**
- Modify: `src/renderer/renderFrame.ts`
- Modify: `src/components/LedCanvas.tsx`

**Interfaces:**
- Consumes:
  - `getCachedRaster(widget, dotSize, scrollStates, deltaMs)` from `./rasterize/rasterizeCache`
  - `evictWidgetCache(widgetId)` from `./rasterize/rasterizeCache`
  - `clearDotSpriteCache()` from `./dotSpriteCache`

- [ ] **Step 1: 更新 renderFrame.ts**

  打开 `src/renderer/renderFrame.ts`，做以下两处修改：

  **1a. 替换 import 行**（将 rasterizeWidget 相关的 4 个 import 改为 getCachedRaster）：

  ```ts
  // 删除这些行：
  import { rasterizeDateTime } from './rasterize/rasterizeDateTime'
  import { rasterizeClock } from './rasterize/rasterizeClock'
  import { rasterizeScrollText, type ScrollState } from './rasterize/rasterizeScrollText'
  import { rasterizePattern } from './rasterize/rasterizePattern'

  // 改为：
  import { getCachedRaster } from './rasterize/rasterizeCache'
  import type { ScrollState } from './rasterize/rasterizeScrollText'
  ```

  **1b. 在 `renderFrame` 函数体内，将 `rasterizeWidget` 调用改为 `getCachedRaster`：**

  ```ts
  // 改前：
  const offscreen = rasterizeWidget(widget, dotSize, scrollStates, deltaMs)

  // 改后：
  const offscreen = getCachedRaster(widget, dotSize, scrollStates, deltaMs)
  ```

  **1c. 删除文件末尾整个 `rasterizeWidget` 函数（74–98 行）：**

  删除以下内容（函数签名到末尾的 `}`）：

  ```ts
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

  同时删除 import 中不再使用的类型（`DateTimeWidget`, `ClockWidget`, `ScrollTextWidget`, `PatternWidget`，如果这些类型在 renderFrame.ts 其他地方也没用到）。

  修改后 `renderFrame.ts` 的完整内容应如下：

  ```ts
  import type { Board, Widget } from '../types'
  import { drawLedDot } from './drawLedDot'
  import { getCachedRaster } from './rasterize/rasterizeCache'
  import type { ScrollState } from './rasterize/rasterizeScrollText'

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

    // Draw all dim dots in a single batched path (much faster than one fill per dot)
    ctx.beginPath()
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const cx = col * step + radius
        const cy = row * step + radius
        ctx.moveTo(cx + radius, cy)
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      }
    }
    ctx.fillStyle = '#1a1a1a'
    ctx.fill()

    // Render each visible widget sorted by zIndex
    const visible = widgets
      .filter((w) => w.visible)
      .sort((a, b) => a.zIndex - b.zIndex)

    for (const widget of visible) {
      const offscreen = getCachedRaster(widget, dotSize, scrollStates, deltaMs)
      if (!offscreen) continue

      const offCtx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D | null
      if (!offCtx) continue

      // Read the entire offscreen canvas once instead of one getImageData per dot
      // (avoids hundreds of synchronous GPU pipeline flushes per frame)
      const offW = widget.width * dotSize
      const offH = widget.height * dotSize
      const imgData = offCtx.getImageData(0, 0, offW, offH).data

      for (let row = 0; row < widget.height; row++) {
        for (let col = 0; col < widget.width; col++) {
          const px = col * dotSize + Math.floor(dotSize / 2)
          const py = row * dotSize + Math.floor(dotSize / 2)
          const alpha = imgData[(py * offW + px) * 4 + 3]

          const screenX = (widget.x + col) * step + radius
          const screenY = (widget.y + row) * step + radius
          drawLedDot(ctx, screenX, screenY, radius, widget.color, alpha > ALPHA_THRESHOLD, renderMode)
        }
      }
    }
  }
  ```

- [ ] **Step 2: 更新 LedCanvas.tsx**

  打开 `src/components/LedCanvas.tsx`，做以下修改：

  **2a. 添加 import：**

  在文件顶部现有 import 之后添加：

  ```ts
  import { clearDotSpriteCache } from '../renderer/dotSpriteCache'
  import { evictWidgetCache } from '../renderer/rasterize/rasterizeCache'
  ```

  **2b. 在组件函数内，`canvasRef` 之后添加 `prevWidgetIdsRef`：**

  ```ts
  const prevWidgetIdsRef = useRef<Set<string>>(new Set())
  ```

  **2c. 在现有 `useEffect`（依赖 `[board, widgets, canvasW, canvasH]`）之前，新增一个追踪 widget ID 的 effect：**

  ```ts
  // Evict raster cache entries for widgets that have been removed
  useEffect(() => {
    const currentIds = new Set(widgets.map((w) => w.id))
    prevWidgetIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) evictWidgetCache(id)
    })
    prevWidgetIdsRef.current = currentIds
  }, [widgets])
  ```

  **2d. 在现有渲染 `useEffect` 的函数体开头（`const canvas = canvasRef.current` 之前）添加精灵缓存清空：**

  ```ts
  // Board parameters changed — invalidate sprite cache so dots are re-rendered
  // at the new size/mode before the next frame.
  clearDotSpriteCache()
  ```

  修改后 `LedCanvas.tsx` 完整内容如下：

  ```tsx
  import { useEffect, useRef } from 'react'
  import type { Board, Widget } from '../types'
  import { renderFrame } from '../renderer/renderFrame'
  import type { ScrollState } from '../renderer/rasterize/rasterizeScrollText'
  import { clearDotSpriteCache } from '../renderer/dotSpriteCache'
  import { evictWidgetCache } from '../renderer/rasterize/rasterizeCache'

  type Props = {
    board: Board
    widgets: Widget[]
    /** CSS display scale factor (default 1). Scales the canvas element visually. */
    scale?: number
    style?: React.CSSProperties
  }

  export default function LedCanvas({ board, widgets, scale = 1, style }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const scrollStatesRef = useRef<Map<string, ScrollState>>(new Map())
    const lastTimeRef = useRef<number>(0)
    const rafRef = useRef<number>(0)
    const prevWidgetIdsRef = useRef<Set<string>>(new Set())

    const step = board.dotSize + board.dotGap
    // Logical (CSS) canvas size
    const canvasW = board.width * step
    const canvasH = board.height * step

    // Evict raster cache entries for widgets that have been removed
    useEffect(() => {
      const currentIds = new Set(widgets.map((w) => w.id))
      prevWidgetIdsRef.current.forEach((id) => {
        if (!currentIds.has(id)) evictWidgetCache(id)
      })
      prevWidgetIdsRef.current = currentIds
    }, [widgets])

    useEffect(() => {
      // Board parameters changed — invalidate sprite cache so dots are re-rendered
      // at the new size/mode before the next frame.
      clearDotSpriteCache()

      const canvas = canvasRef.current
      if (!canvas) return

      // ── HiDPI fix ────────────────────────────────────────────────────────
      // The canvas attribute size must match the physical pixel density so
      // each LED dot is rendered at full resolution on Retina / HiDPI screens.
      // We scale the 2D context by dpr so renderFrame can continue drawing in
      // logical CSS coordinates (board.dotSize, board.dotGap stay unchanged).
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(canvasW * dpr)
      canvas.height = Math.round(canvasH * dpr)

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      function loop(timestamp: number) {
        const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16
        lastTimeRef.current = timestamp

        // Re-apply the dpr scale at the start of every frame because some
        // browsers reset the transform after a canvas resize.
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

        renderFrame(ctx!, board, widgets, scrollStatesRef.current, delta)
        rafRef.current = requestAnimationFrame(loop)
      }

      rafRef.current = requestAnimationFrame(loop)
      return () => cancelAnimationFrame(rafRef.current)
    }, [board, widgets, canvasW, canvasH])

    return (
      <canvas
        ref={canvasRef}
        // width/height set imperatively in the effect (dpr-aware); setting them
        // here as fallback values avoids a zero-size canvas on first paint.
        width={canvasW}
        height={canvasH}
        style={{
          display: 'block',
          // CSS size stays at logical pixels — dpr handled internally
          width: canvasW * scale,
          height: canvasH * scale,
          ...style,
        }}
      />
    )
  }
  ```

- [ ] **Step 3: 确认全部测试通过**

  ```bash
  pnpm test
  ```

  预期：所有测试 PASS，无新增失败

- [ ] **Step 4: 提交**

  ```bash
  git add src/renderer/renderFrame.ts src/components/LedCanvas.tsx
  git commit -m "feat: wire sprite cache and raster cache into render pipeline"
  ```

---

## 集成验收（手动）

完成上述 4 个任务后，在浏览器中验证：

1. **帧率验证：** Chrome DevTools → Performance 面板，录制 5 秒，确认 200×100 写实模式下帧率较优化前有明显提升（预期从个位数 fps 提升至 20fps+）
2. **视觉验收：** 写实模式光晕效果与原版视觉近似，无明显退化
3. **缓存正确性：** 修改某 widget 颜色后，下一帧立即显示新颜色（缓存正确失效）
4. **widget 删除：** 删除 widget 后无内存泄漏（DevTools Memory 面板中 widgetCache Map 条目数随 widget 数量变化）
5. **配置页往返：** 切换至 `/config` 再切回 `/`，渲染页显示正常
