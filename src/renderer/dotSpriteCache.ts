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
