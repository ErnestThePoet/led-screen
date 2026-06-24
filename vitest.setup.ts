import 'vitest-canvas-mock'
import '@testing-library/jest-dom'

// Polyfill OffscreenCanvas for jsdom
if (typeof OffscreenCanvas === 'undefined') {
  ;(globalThis as any).OffscreenCanvas = class {
    width: number
    height: number
    constructor(w: number, h: number) {
      this.width = w
      this.height = h
    }
    getContext() {
      const canvas = document.createElement('canvas')
      canvas.width = this.width
      canvas.height = this.height
      return canvas.getContext('2d')
    }
  }
}

// Patch the canvas mock to allow shadowBlur = 0
// vitest-canvas-mock (backed by jest-canvas-mock) rejects shadowBlur = 0 by default, but the
// Canvas 2D Context spec requires the ability to reset shadowBlur to 0 after drawing. This patch
// relaxes the validation to accept any non-negative value, allowing the reset behavior needed
// by drawLedDot() when drawing between different shadow blur states.
const originalGetCanvasElement = (globalThis as any).HTMLCanvasElement?.prototype?.getContext
if (originalGetCanvasElement) {
  ;(globalThis as any).HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    const ctx = originalGetCanvasElement.call(this, contextType)
    if (contextType === '2d' && ctx && !(ctx as any)._shadowBlurPatched) {
      const originalShadowBlurDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), 'shadowBlur')
      if (originalShadowBlurDescriptor) {
        Object.defineProperty(ctx, 'shadowBlur', {
          get: originalShadowBlurDescriptor.get,
          set: function (value: number) {
            const result = Number(value)
            // Allow 0 to reset shadowBlur
            if (Number.isFinite(result) && result >= 0) {
              const stackIndex = (this as any)._stackIndex
              ;(this as any)._shadowBlurStack[stackIndex] = result
            }
          }
        })
      }
      ;(ctx as any)._shadowBlurPatched = true
    }
    return ctx
  }
}
