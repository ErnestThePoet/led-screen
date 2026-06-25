import 'vitest-canvas-mock'
import '@testing-library/jest-dom'

// Polyfill OffscreenCanvas for jsdom — backed by HTMLCanvasElement so that
// jest-canvas-mock's drawImage type-check (instanceof HTMLCanvasElement) passes.
if (typeof OffscreenCanvas === 'undefined') {
  class OffscreenCanvasPolyfill extends HTMLCanvasElement {
    constructor(w: number, h: number) {
      super()
      this.width = w
      this.height = h
    }
  }
  // customElements.define is required to subclass HTMLCanvasElement in jsdom
  customElements.define('offscreen-canvas-polyfill', OffscreenCanvasPolyfill, { extends: 'canvas' })
  ;(globalThis as any).OffscreenCanvas = OffscreenCanvasPolyfill
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
