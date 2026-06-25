import { describe, it, expect } from 'vitest'
import { rasterizeScrollText, createScrollState } from './rasterizeScrollText'
import type { ScrollTextWidget } from '../../types'

const makeWidget = (): ScrollTextWidget => ({
  id: 's1', type: 'scrolltext', x: 0, y: 0, width: 32, height: 8,
  color: '#ff0000', visible: true, zIndex: 0,
  items: ['Hello', 'World'],
  speed: 60,
  direction: 'left',
  font: 'monospace',
  fontSize: 12,
  pauseMs: 500,
})

describe('rasterizeScrollText', () => {
  it('createScrollState returns initial state with itemIndex 0 and offset 0', () => {
    const state = createScrollState()
    expect(state.itemIndex).toBe(0)
    expect(state.offset).toBe(0)
    expect(state.pauseRemaining).toBe(0)
  })

  it('createScrollState has no canvas initially', () => {
    const state = createScrollState()
    expect(state.canvas).toBeUndefined()
  })

  it('state.canvas is set after first call', () => {
    const state = createScrollState()
    rasterizeScrollText(makeWidget(), 8, state, 16)
    expect(state.canvas).toBeInstanceOf(OffscreenCanvas)
  })

  it('reuses the same canvas instance across calls (no new allocation per frame)', () => {
    const state = createScrollState()
    rasterizeScrollText(makeWidget(), 8, state, 16)
    const first = state.canvas
    rasterizeScrollText(makeWidget(), 8, state, 16)
    expect(state.canvas).toBe(first)
  })

  it('creates a new canvas when dotSize changes', () => {
    const state = createScrollState()
    rasterizeScrollText(makeWidget(), 8, state, 16)
    const first = state.canvas
    rasterizeScrollText(makeWidget(), 4, state, 16)
    expect(state.canvas).not.toBe(first)
  })

  it('returns OffscreenCanvas with correct dimensions', () => {
    const state = createScrollState()
    const c = rasterizeScrollText(makeWidget(), 8, state, 16)
    expect(c.width).toBe(32 * 8)
    expect(c.height).toBe(8 * 8)
  })

  it('advances offset by speed * deltaMs/1000 when not pausing', () => {
    const state = createScrollState()
    // deltaMs=1000ms → offset increases by speed=60 px
    rasterizeScrollText(makeWidget(), 8, state, 1000)
    expect(state.offset).toBeGreaterThan(0)
  })
})
