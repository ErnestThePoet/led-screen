import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getCachedRaster, evictWidgetCache } from './rasterizeCache'
import type { PatternWidget, ClockWidget, DateTimeWidget, ScrollTextWidget } from '../../types'
import type { ScrollState } from './rasterizeScrollText'

function makePattern(id: string, dots?: boolean[][]): PatternWidget {
  return {
    id,
    type: 'pattern',
    x: 0, y: 0, width: 4, height: 4,
    color: '#ff0000',
    visible: true,
    zIndex: 0,
    dots: dots ?? Array.from({ length: 4 }, () => Array<boolean>(4).fill(false)),
  }
}

function makeClock(id: string, showSecondHand = true): ClockWidget {
  return {
    id,
    type: 'clock',
    x: 0, y: 0, width: 16, height: 16,
    color: '#ffffff',
    visible: true,
    zIndex: 0,
    showSecondHand,
  }
}

function makeScrollText(id: string): ScrollTextWidget {
  return {
    id,
    type: 'scrolltext',
    x: 0, y: 0, width: 32, height: 8,
    color: '#00ff00',
    visible: true,
    zIndex: 0,
    items: ['hello'],
    speed: 60,
    direction: 'left',
    font: 'monospace',
    fontSize: 8,
    pauseMs: 0,
  }
}

describe('rasterizeCache', () => {
  const scrollStates = new Map<string, ScrollState>()

  beforeEach(() => {
    evictWidgetCache('w1')
    evictWidgetCache('w2')
    scrollStates.clear()
  })

  describe('pattern', () => {
    it('returns an OffscreenCanvas', () => {
      const result = getCachedRaster(makePattern('w1'), 4, scrollStates, 16)
      expect(result).toBeInstanceOf(OffscreenCanvas)
    })

    it('returns the same canvas instance on repeated calls with same dots', () => {
      const dots = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false))
      const a = getCachedRaster(makePattern('w1', dots), 4, scrollStates, 16)
      const b = getCachedRaster(makePattern('w1', dots), 4, scrollStates, 16)
      expect(a).toBe(b)
    })

    it('returns a new canvas instance when dots content changes', () => {
      const dots1 = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false))
      const dots2 = Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => r === 0 && c === 0)
      )
      const a = getCachedRaster(makePattern('w1', dots1), 4, scrollStates, 16)
      const b = getCachedRaster(makePattern('w1', dots2), 4, scrollStates, 16)
      expect(a).not.toBe(b)
    })
  })

  describe('clock', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('returns the same canvas within the same second (showSecondHand=true)', () => {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      const a = getCachedRaster(makeClock('w1', true), 4, scrollStates, 16)
      const b = getCachedRaster(makeClock('w1', true), 4, scrollStates, 16)
      expect(a).toBe(b)
    })

    it('returns a new canvas after a second elapses (showSecondHand=true)', () => {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      const a = getCachedRaster(makeClock('w1', true), 4, scrollStates, 16)
      vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z'))
      const b = getCachedRaster(makeClock('w1', true), 4, scrollStates, 16)
      expect(a).not.toBe(b)
    })

    it('does not re-render within the same minute (showSecondHand=false)', () => {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      const a = getCachedRaster(makeClock('w1', false), 4, scrollStates, 16)
      vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'))
      const b = getCachedRaster(makeClock('w1', false), 4, scrollStates, 16)
      expect(a).toBe(b)
    })
  })

  describe('scrolltext', () => {
    it('returns a new OffscreenCanvas on every call (no caching)', () => {
      const a = getCachedRaster(makeScrollText('w1'), 4, scrollStates, 16)
      const b = getCachedRaster(makeScrollText('w1'), 4, scrollStates, 16)
      expect(a).not.toBe(b)
    })
  })

  describe('evictWidgetCache', () => {
    it('removes the cached entry so next call rebuilds', () => {
      const dots = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false))
      const a = getCachedRaster(makePattern('w1', dots), 4, scrollStates, 16)
      evictWidgetCache('w1')
      const b = getCachedRaster(makePattern('w1', dots), 4, scrollStates, 16)
      expect(a).not.toBe(b)
    })

    it('is a no-op for unknown widget IDs', () => {
      expect(() => evictWidgetCache('nonexistent')).not.toThrow()
    })
  })
})
