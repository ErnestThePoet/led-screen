import { describe, it, expect, beforeEach } from 'vitest'
import { getDotSprite, clearDotSpriteCache } from './dotSpriteCache'

describe('dotSpriteCache', () => {
  beforeEach(() => {
    clearDotSpriteCache()
  })

  it('returns null for dotSize <= 0', () => {
    expect(getDotSprite('#ff0000', 0, 'clean')).toBeNull()
    expect(getDotSprite('#ff0000', -1, 'clean')).toBeNull()
  })

  it('returns an OffscreenCanvas for valid inputs', () => {
    const sprite = getDotSprite('#ff0000', 8, 'clean')
    expect(sprite).toBeInstanceOf(OffscreenCanvas)
  })

  it('returns the same instance on repeated calls (cache hit)', () => {
    const a = getDotSprite('#ff0000', 8, 'clean')
    const b = getDotSprite('#ff0000', 8, 'clean')
    expect(a).toBe(b)
  })

  it('returns different instances for different colors', () => {
    const a = getDotSprite('#ff0000', 8, 'clean')
    const b = getDotSprite('#00ff00', 8, 'clean')
    expect(a).not.toBe(b)
  })

  it('returns different instances for different modes', () => {
    const a = getDotSprite('#ff0000', 8, 'clean')
    const b = getDotSprite('#ff0000', 8, 'realistic')
    expect(a).not.toBe(b)
  })

  it('returns different instances for different dotSizes', () => {
    const a = getDotSprite('#ff0000', 8, 'clean')
    const b = getDotSprite('#ff0000', 10, 'clean')
    expect(a).not.toBe(b)
  })

  it('clearDotSpriteCache causes a new instance to be built', () => {
    const a = getDotSprite('#ff0000', 8, 'clean')
    clearDotSpriteCache()
    const b = getDotSprite('#ff0000', 8, 'clean')
    expect(a).not.toBe(b)
  })

  it('sprite dimensions are dotSize*3 × dotSize*3', () => {
    const dotSize = 8
    const sprite = getDotSprite('#ff0000', dotSize, 'clean')!
    expect(sprite.width).toBe(dotSize * 3)
    expect(sprite.height).toBe(dotSize * 3)
  })
})
