import { describe, it, expect } from 'vitest'
import { rasterizePattern } from './rasterizePattern'
import type { PatternWidget } from '../../types'

const makePatternWidget = (overrides?: Partial<PatternWidget>): PatternWidget => ({
  id: 'p1', type: 'pattern', x: 0, y: 0, width: 4, height: 2,
  color: '#ff0000', visible: true, zIndex: 0,
  dots: [
    [true, false, true, false],
    [false, true, false, true],
  ],
  ...overrides,
})

describe('rasterizePattern', () => {
  it('returns an OffscreenCanvas with width = widget.width * dotSize', () => {
    const w = makePatternWidget()
    const canvas = rasterizePattern(w, 8)
    expect(canvas.width).toBe(4 * 8)
  })

  it('returns an OffscreenCanvas with height = widget.height * dotSize', () => {
    const w = makePatternWidget()
    const canvas = rasterizePattern(w, 8)
    expect(canvas.height).toBe(2 * 8)
  })
})
