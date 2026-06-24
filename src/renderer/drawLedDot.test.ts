import { describe, it, expect, beforeEach } from 'vitest'
import { drawLedDot } from './drawLedDot'

describe('drawLedDot', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    ctx = canvas.getContext('2d')!
  })

  it('sets fillStyle to dim color when not lit', () => {
    drawLedDot(ctx, 50, 50, 4, '#ff0000', false, 'clean')
    expect(ctx.fillStyle).toBe('#1a1a1a')
  })

  it('sets fillStyle to widget color when lit in clean mode', () => {
    drawLedDot(ctx, 50, 50, 4, '#00ff00', true, 'clean')
    expect(ctx.fillStyle).toBe('#00ff00')
  })

  it('calls arc to draw a circle', () => {
    drawLedDot(ctx, 50, 50, 4, '#ffffff', true, 'clean')
    // vitest-canvas-mock records calls
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 4, 0, Math.PI * 2)
  })

  it('sets shadowBlur to 0 for clean mode lit dot', () => {
    drawLedDot(ctx, 50, 50, 4, '#ff0000', true, 'clean')
    expect(ctx.shadowBlur).toBe(0)
  })

  it('resets shadowBlur to 0 after realistic lit dot', () => {
    drawLedDot(ctx, 50, 50, 4, '#ff0000', true, 'realistic')
    expect(ctx.shadowBlur).toBe(0) // reset after draw
  })
})
