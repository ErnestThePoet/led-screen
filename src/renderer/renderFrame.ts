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
    const offscreen = rasterizeWidget(widget, dotSize, scrollStates, deltaMs)
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
