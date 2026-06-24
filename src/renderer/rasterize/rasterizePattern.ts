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
