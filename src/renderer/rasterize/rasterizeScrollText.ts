import type { ScrollTextWidget } from '../../types'

export type ScrollState = {
  itemIndex: number
  offset: number
  pauseRemaining: number
}

export function createScrollState(): ScrollState {
  return { itemIndex: 0, offset: 0, pauseRemaining: 0 }
}

/**
 * Rasterizes the current scroll text frame. Mutates `state` in place.
 * Canvas size: (widget.width * dotSize) × (widget.height * dotSize).
 */
export function rasterizeScrollText(
  widget: ScrollTextWidget,
  dotSize: number,
  state: ScrollState,
  deltaMs: number
): OffscreenCanvas {
  const { width, height, items, speed, direction, font, fontSize, pauseMs } = widget
  const canvasW = width * dotSize
  const canvasH = height * dotSize
  const canvas = new OffscreenCanvas(canvasW, canvasH)
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = '#ffffff'
  ctx.font = `${fontSize}px "${font}"`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'start'

  if (items.length === 0) return canvas

  const text = items[state.itemIndex % items.length]
  const textW = ctx.measureText(text).width

  if (state.pauseRemaining > 0) {
    // Pause: draw text centered, decrement timer
    ctx.textAlign = 'center'
    ctx.fillText(text, canvasW / 2, canvasH / 2)
    state.pauseRemaining = Math.max(0, state.pauseRemaining - deltaMs)
  } else {
    const pixelStep = speed * (deltaMs / 1000)

    if (direction === 'left') {
      const x = canvasW - state.offset
      ctx.fillText(text, x, canvasH / 2)
      state.offset += pixelStep
      // Text fully scrolled off left edge
      if (state.offset > canvasW + textW) {
        state.offset = 0
        state.itemIndex = (state.itemIndex + 1) % items.length
        state.pauseRemaining = pauseMs
      }
    } else if (direction === 'right') {
      const x = -textW + state.offset
      ctx.fillText(text, x, canvasH / 2)
      state.offset += pixelStep
      if (state.offset > canvasW + textW) {
        state.offset = 0
        state.itemIndex = (state.itemIndex + 1) % items.length
        state.pauseRemaining = pauseMs
      }
    } else if (direction === 'up') {
      ctx.textAlign = 'center'
      const y = canvasH - state.offset
      ctx.fillText(text, canvasW / 2, y)
      state.offset += pixelStep
      if (state.offset > canvasH + fontSize) {
        state.offset = 0
        state.itemIndex = (state.itemIndex + 1) % items.length
        state.pauseRemaining = pauseMs
      }
    } else {
      // down
      ctx.textAlign = 'center'
      const y = -fontSize + state.offset
      ctx.fillText(text, canvasW / 2, y)
      state.offset += pixelStep
      if (state.offset > canvasH + fontSize) {
        state.offset = 0
        state.itemIndex = (state.itemIndex + 1) % items.length
        state.pauseRemaining = pauseMs
      }
    }
  }

  return canvas
}
