import { describe, it, expect } from 'vitest'
import { rasterizeDateTime } from './rasterizeDateTime'
import type { DateTimeWidget } from '../../types'

const makeWidget = (): DateTimeWidget => ({
  id: 'd1', type: 'datetime', x: 0, y: 0, width: 48, height: 8,
  color: '#ff0000', visible: true, zIndex: 0,
  format: 'HH:mm', font: 'monospace', fontSize: 12,
})

describe('rasterizeDateTime', () => {
  it('returns OffscreenCanvas with correct dimensions', () => {
    const c = rasterizeDateTime(makeWidget(), 8)
    expect(c.width).toBe(48 * 8)
    expect(c.height).toBe(8 * 8)
  })
})
