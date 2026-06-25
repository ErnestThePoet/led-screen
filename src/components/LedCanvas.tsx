import { useEffect, useRef } from 'react'
import type { Board, Widget } from '../types'
import { renderFrame } from '../renderer/renderFrame'
import type { ScrollState } from '../renderer/rasterize/rasterizeScrollText'
import { clearDotSpriteCache } from '../renderer/dotSpriteCache'
import { clearDimGridCache } from '../renderer/dimGridCache'
import { evictWidgetCache, clearRasterCache } from '../renderer/rasterize/rasterizeCache'

type Props = {
  board: Board
  widgets: Widget[]
  /** CSS display scale factor (default 1). Scales the canvas element visually. */
  scale?: number
  style?: React.CSSProperties
}

export default function LedCanvas({ board, widgets, scale = 1, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollStatesRef = useRef<Map<string, ScrollState>>(new Map())
  const lastTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const prevWidgetIdsRef = useRef<Set<string>>(new Set())

  const step = board.dotSize + board.dotGap
  // Logical (CSS) canvas size
  const canvasW = board.width * step
  const canvasH = board.height * step

  // Clear all caches when board geometry or render mode changes so sprites,
  // rasters and the dim-dot grid are rebuilt at the new values on the next frame.
  useEffect(() => {
    clearDotSpriteCache()
    clearDimGridCache()
    clearRasterCache()
  }, [board.dotSize, board.dotGap, board.renderMode, board.width, board.height])

  // Evict raster cache entries for widgets that have been removed
  useEffect(() => {
    const currentIds = new Set(widgets.map((w) => w.id))
    prevWidgetIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) evictWidgetCache(id)
    })
    prevWidgetIdsRef.current = currentIds
  }, [widgets])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── HiDPI fix ────────────────────────────────────────────────────────
    // The canvas attribute size must match the physical pixel density so
    // each LED dot is rendered at full resolution on Retina / HiDPI screens.
    // We scale the 2D context by dpr so renderFrame can continue drawing in
    // logical CSS coordinates (board.dotSize, board.dotGap stay unchanged).
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(canvasW * dpr)
    canvas.height = Math.round(canvasH * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Cap render rate at 30 fps — the LED display is low-resolution and
    // scrolling text looks smooth at 30 fps while halving CPU/GPU load on
    // thin laptops compared to 60/120 fps.  δt accumulates across skipped
    // RAF ticks so animation speed stays correct regardless of display refresh rate.
    const TARGET_FPS = 30
    const FRAME_INTERVAL = 1000 / TARGET_FPS // ~33.3 ms

    function loop(timestamp: number) {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16

      // Not enough time has elapsed — re-queue without rendering or updating
      // lastTimeRef so the accumulated δt is passed to the next rendered frame.
      if (lastTimeRef.current && delta < FRAME_INTERVAL) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      lastTimeRef.current = timestamp

      // Re-apply the dpr scale at the start of every frame because some
      // browsers reset the transform after a canvas resize.
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      renderFrame(ctx!, board, widgets, scrollStatesRef.current, delta)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [board, widgets, canvasW, canvasH])

  return (
    <canvas
      ref={canvasRef}
      // width/height set imperatively in the effect (dpr-aware); setting them
      // here as fallback values avoids a zero-size canvas on first paint.
      width={canvasW}
      height={canvasH}
      style={{
        display: 'block',
        // CSS size stays at logical pixels — dpr handled internally
        width: canvasW * scale,
        height: canvasH * scale,
        ...style,
      }}
    />
  )
}
