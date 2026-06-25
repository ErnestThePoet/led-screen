import type { Widget, PatternWidget, DateTimeWidget, ClockWidget, ScrollTextWidget } from '../../types'
import type { ScrollState } from './rasterizeScrollText'
import { rasterizePattern } from './rasterizePattern'
import { rasterizeDateTime } from './rasterizeDateTime'
import { rasterizeClock } from './rasterizeClock'
import { rasterizeScrollText } from './rasterizeScrollText'

type CacheEntry = {
  canvas: OffscreenCanvas
  key: string
}

const widgetCache = new Map<string, CacheEntry>()

function patternKey(widget: PatternWidget): string {
  return JSON.stringify(widget.dots)
}

function dateTimeKey(widget: DateTimeWidget): string {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  const includesSecs = widget.format.includes('s') || widget.format.includes('S')
  return includesSecs
    ? `${widget.format}:${h}:${m}:${s}`
    : `${widget.format}:${h}:${m}`
}

function clockKey(widget: ClockWidget): string {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  return widget.showSecondHand ? `${h}:${m}:${s}` : `${h}:${m}`
}

function getOrBuild(
  widgetId: string,
  key: string,
  build: () => OffscreenCanvas
): OffscreenCanvas {
  const entry = widgetCache.get(widgetId)
  if (entry && entry.key === key) return entry.canvas
  const canvas = build()
  widgetCache.set(widgetId, { canvas, key })
  return canvas
}

export function getCachedRaster(
  widget: Widget,
  dotSize: number,
  scrollStates: Map<string, ScrollState>,
  deltaMs: number
): OffscreenCanvas | null {
  switch (widget.type) {
    case 'pattern':
      return getOrBuild(
        widget.id,
        patternKey(widget as PatternWidget),
        () => rasterizePattern(widget as PatternWidget, dotSize)
      )

    case 'datetime':
      return getOrBuild(
        widget.id,
        dateTimeKey(widget as DateTimeWidget),
        () => rasterizeDateTime(widget as DateTimeWidget, dotSize)
      )

    case 'clock':
      return getOrBuild(
        widget.id,
        clockKey(widget as ClockWidget),
        () => rasterizeClock(widget as ClockWidget, dotSize)
      )

    case 'scrolltext': {
      let state = scrollStates.get(widget.id)
      if (!state) {
        state = { itemIndex: 0, offset: 0, pauseRemaining: 0 }
        scrollStates.set(widget.id, state)
      }
      return rasterizeScrollText(widget as ScrollTextWidget, dotSize, state, deltaMs)
    }

    default:
      return null
  }
}

export function evictWidgetCache(widgetId: string): void {
  widgetCache.delete(widgetId)
}

export function clearRasterCache(): void {
  widgetCache.clear()
}
