import { describe, it, expect } from 'vitest'
import { rasterizeClock } from './rasterizeClock'
import type { ClockWidget } from '../../types'

const makeClockWidget = (): ClockWidget => ({
  id: 'c1', type: 'clock', x: 0, y: 0, width: 24, height: 24,
  color: '#ffffff', visible: true, zIndex: 0, showSecondHand: true,
})

describe('rasterizeClock', () => {
  it('returns OffscreenCanvas with correct dimensions', () => {
    const c = rasterizeClock(makeClockWidget(), 8)
    expect(c.width).toBe(24 * 8)
    expect(c.height).toBe(24 * 8)
  })
})
