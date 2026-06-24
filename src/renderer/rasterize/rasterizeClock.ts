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
  ctx: CanvasRenderingContext2D,
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
