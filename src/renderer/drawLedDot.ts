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
