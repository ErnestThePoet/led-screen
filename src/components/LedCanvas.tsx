import { useEffect, useRef } from 'react'
import type { Board, Widget } from '../types'
import { renderFrame } from '../renderer/renderFrame'
import type { ScrollState } from '../renderer/rasterize/rasterizeScrollText'

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

  const step = board.dotSize + board.dotGap
  // Logical (CSS) canvas size
  const canvasW = board.width * step
  const canvasH = board.height * step

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

    function loop(timestamp: number) {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16
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
