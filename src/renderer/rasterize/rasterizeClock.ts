import type { ClockWidget } from '../../types'

/**
 * Rasterizes an analog clock face to an OffscreenCanvas.
 *
 * LED-grid constraint: the renderer samples one pixel per dot at the cell
 * centre (col*dotSize + dotSize/2). To reliably light up dots along any
 * stroke, every line/arc must be at least `dotSize` pixels wide so the
 * activation band spans an entire cell pitch. All lineWidths below use
 * `dotSize` (or a fraction ≥ 0.7*dotSize) to satisfy this constraint.
 */
export function rasterizeClock(widget: ClockWidget, dotSize: number): OffscreenCanvas {
  const { width, height, showSecondHand } = widget
  const canvasW = width * dotSize
  const canvasH = height * dotSize
  const canvas = new OffscreenCanvas(canvasW, canvasH)
  const ctx = canvas.getContext('2d')!

  const cx = canvasW / 2
  const cy = canvasH / 2
  const r = Math.min(cx, cy) * 0.92

  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  // Base line width = dotSize ensures every stroke reliably covers LED centres
  const lw = dotSize

  // ── Clock face circle ────────────────────────────────────────────────────
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // ── Hour markers (12 ticks, longer so they're clearly visible) ───────────
  ctx.lineWidth = lw
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
    // Major ticks (3, 6, 9, 12) are longer
    const inner = i % 3 === 0 ? r * 0.65 : r * 0.78
    const outer = r * 0.90
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)
    ctx.stroke()
  }

  const now = new Date()
  const h = now.getHours() % 12
  const m = now.getMinutes()
  const s = now.getSeconds()

  // ── Hour hand (short, thick) ─────────────────────────────────────────────
  const hAngle = ((h + m / 60) / 12) * Math.PI * 2 - Math.PI / 2
  drawHand(ctx, cx, cy, hAngle, r * 0.50, lw * 1.5)

  // ── Minute hand (long, medium) ───────────────────────────────────────────
  const mAngle = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2
  drawHand(ctx, cx, cy, mAngle, r * 0.75, lw * 1.2)

  // ── Second hand (longest, thin-but-still-≥lw) ───────────────────────────
  if (showSecondHand) {
    const sAngle = (s / 60) * Math.PI * 2 - Math.PI / 2
    ctx.strokeStyle = '#ff4444'
    drawHand(ctx, cx, cy, sAngle, r * 0.85, Math.max(lw * 0.8, 2))
    ctx.strokeStyle = '#ffffff'
  }

  // ── Centre dot ──────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(cx, cy, lw, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}

function drawHand(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width: number
): void {
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length)
  ctx.stroke()
}
