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
