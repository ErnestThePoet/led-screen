import { describe, it, expect, beforeEach } from 'vitest'
import { drawLedDot } from './drawLedDot'
import { clearDotSpriteCache } from './dotSpriteCache'

describe('drawLedDot', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    clearDotSpriteCache()
    canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    ctx = canvas.getContext('2d')!
  })

  it('sets fillStyle to dim color when not lit', () => {
    drawLedDot(ctx, 50, 50, 4, '#ff0000', false, 'clean')
    expect(ctx.fillStyle).toBe('#1a1a1a')
  })

  it('calls arc for unlit dot', () => {
    drawLedDot(ctx, 50, 50, 4, '#ffffff', false, 'clean')
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 4, 0, Math.PI * 2)
  })

  it('calls drawImage (sprite) when lit in clean mode', () => {
    drawLedDot(ctx, 50, 50, 4, '#00ff00', true, 'clean')
    expect(ctx.drawImage).toHaveBeenCalled()
  })

  it('calls drawImage (sprite) when lit in realistic mode', () => {
    drawLedDot(ctx, 50, 50, 4, '#ff0000', true, 'realistic')
    expect(ctx.drawImage).toHaveBeenCalled()
  })

  it('does not set shadowBlur for lit dot', () => {
    drawLedDot(ctx, 50, 50, 4, '#ff0000', true, 'realistic')
    // shadowBlur must never be set; default is 0
    expect(ctx.shadowBlur).toBe(0)
  })

  it('drawImage is centered on (cx, cy) with size dotSize*3', () => {
    const cx = 50, cy = 50, radius = 4
    const dotSize = radius * 2  // 8
    drawLedDot(ctx, cx, cy, radius, '#ff0000', true, 'clean')
    // Expected call: ctx.drawImage(sprite, cx - radius*3, cy - radius*3, dotSize*3, dotSize*3)
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),        // the sprite canvas
      cx - radius * 3,          // x = 50 - 12 = 38
      cy - radius * 3,          // y = 50 - 12 = 38
      dotSize * 3,              // w = 24
      dotSize * 3               // h = 24
    )
  })
})
