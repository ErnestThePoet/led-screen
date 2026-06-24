import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'   // register Chinese locale (tree-shaken if unused)
import type { DateTimeWidget } from '../../types'

/**
 * Rasterizes the current date/time string to an OffscreenCanvas.
 * Canvas size: (widget.width * dotSize) × (widget.height * dotSize).
 *
 * Locale support:
 *   en     – default English. ddd → "Wed",  dddd → "Wednesday"
 *   zh-cn  – Simplified Chinese.  ddd → "周三", dddd → "星期三"
 */
export function rasterizeDateTime(widget: DateTimeWidget, dotSize: number): OffscreenCanvas {
  const { width, height, format, font, fontSize, locale } = widget
  const canvasW = width * dotSize
  const canvasH = height * dotSize
  const canvas = new OffscreenCanvas(canvasW, canvasH)
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = '#ffffff'
  ctx.font = `${fontSize * dotSize}px "${font}"`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'

  // dayjs().locale() is per-instance and does not mutate the global default
  const text = dayjs().locale(locale ?? 'en').format(format)
  ctx.fillText(text, canvasW / 2, canvasH / 2)

  return canvas
}
