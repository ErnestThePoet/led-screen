import { describe, it, expect, beforeEach } from 'vitest'
import { renderFrame } from './renderFrame'
import { createScrollState } from './rasterize/rasterizeScrollText'
import type { Board, ScrollTextWidget } from '../types'

function makeBoard(w: number, h: number): Board {
  return { width: w, height: h, dotSize: 8, dotGap: 2, backgroundColor: '#000000', renderMode: 'clean' }
}

function makeEmptyScrollText(w: number, h: number): ScrollTextWidget {
  return {
    id: 'w1', type: 'scrolltext', x: 0, y: 0, width: w, height: h,
    color: '#ffffff', visible: true, zIndex: 0,
    items: [],   // empty → offscreen canvas stays blank (all alpha=0)
    speed: 60, direction: 'left', font: 'monospace', fontSize: 12, pauseMs: 500,
  }
}

describe('renderFrame', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    ctx = canvas.getContext('2d')!
    ;(ctx.arc as any).mockClear()
    ;(ctx.drawImage as any).mockClear()
    ;(ctx.fill as any).mockClear()
  })

  it('calls ctx.arc 0 times on the main canvas — dim batch is a single drawImage from dimGridCache', () => {
    // The dim-dot grid is now pre-rendered into dimGridCache and composited
    // via drawImage — the main ctx.arc should never be called from renderFrame.
    // Widget has no items (all alpha=0), so no sprite drawImage either.
    const board = makeBoard(4, 4)
    const widget = makeEmptyScrollText(2, 2)
    const scrollStates = new Map([['w1', createScrollState()]])

    renderFrame(ctx, board, [widget], scrollStates, 16)

    expect((ctx.arc as any).mock.calls.length).toBe(0)
  })

  it('calls drawImage at least once (for the dim grid) even with no widgets', () => {
    // The pre-rendered dim grid is always composited via a single drawImage.
    const board = makeBoard(4, 4)
    const scrollStates = new Map<string, ReturnType<typeof createScrollState>>()

    renderFrame(ctx, board, [], scrollStates, 16)

    expect((ctx.drawImage as any).mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})
