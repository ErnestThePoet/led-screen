import type { Board, Widget } from '../types'
import { drawLedDot } from './drawLedDot'
import { getDimGrid } from './dimGridCache'
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

  // Composite the pre-rendered dim-dot grid in a single drawImage call.
  // getDimGrid() builds the 45 000-arc path only once per geometry change and
  // caches the result, turning per-frame path construction into a GPU blit.
  ctx.drawImage(getDimGrid(width, height, dotSize, dotGap), 0, 0)

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

        // Dim dots are already drawn in the batch above; skip unlit widget pixels
        // entirely to avoid redundant per-dot arc+fill calls (5× speedup at 300×150).
        if (alpha <= ALPHA_THRESHOLD) continue

        const screenX = (widget.x + col) * step + radius
        const screenY = (widget.y + row) * step + radius
        drawLedDot(ctx, screenX, screenY, radius, widget.color, true, renderMode)
      }
    }
  }
}
