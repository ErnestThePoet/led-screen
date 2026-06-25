import { describe, it, expect, beforeEach } from 'vitest'
import { getDimGrid, clearDimGridCache } from './dimGridCache'

describe('dimGridCache', () => {
  beforeEach(() => {
    clearDimGridCache()
  })

  it('returns an OffscreenCanvas with correct pixel dimensions', () => {
    const width = 8, height = 4, dotSize = 8, dotGap = 2
    const step = dotSize + dotGap
    const grid = getDimGrid(width, height, dotSize, dotGap)
    expect(grid).toBeInstanceOf(OffscreenCanvas)
    expect(grid.width).toBe(width * step)
    expect(grid.height).toBe(height * step)
  })

  it('returns the same instance on cache hit (no re-allocation)', () => {
    const first = getDimGrid(10, 5, 8, 2)
    const second = getDimGrid(10, 5, 8, 2)
    expect(second).toBe(first)
  })

  it('returns a new instance for different dotSize', () => {
    const first = getDimGrid(10, 5, 8, 2)
    const second = getDimGrid(10, 5, 4, 2)
    expect(second).not.toBe(first)
  })

  it('returns a new instance for different dotGap', () => {
    const first = getDimGrid(10, 5, 8, 2)
    const second = getDimGrid(10, 5, 8, 4)
    expect(second).not.toBe(first)
  })

  it('returns a new instance after clearDimGridCache', () => {
    const first = getDimGrid(10, 5, 8, 2)
    clearDimGridCache()
    const second = getDimGrid(10, 5, 8, 2)
    expect(second).not.toBe(first)
  })
})
