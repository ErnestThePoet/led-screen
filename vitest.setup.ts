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
