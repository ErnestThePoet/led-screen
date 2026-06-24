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
