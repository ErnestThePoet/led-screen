import { useEffect, useRef } from 'react'
import type { Board, Widget } from '../types'
import { renderFrame } from '../renderer/renderFrame'
import type { ScrollState } from '../renderer/rasterize/rasterizeScrollText'

type Props = {
  board: Board
  widgets: Widget[]
  /** Rendering scale factor (default 1). Scales the canvas element visually. */
  scale?: number
  style?: React.CSSProperties
}

export default function LedCanvas({ board, widgets, scale = 1, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollStatesRef = useRef<Map<string, ScrollState>>(new Map())
  const lastTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const step = board.dotSize + board.dotGap
  const canvasW = board.width * step
  const canvasH = board.height * step

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function loop(timestamp: number) {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16
      lastTimeRef.current = timestamp
      renderFrame(ctx!, board, widgets, scrollStatesRef.current, delta)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [board, widgets])

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      style={{
        display: 'block',
        width: canvasW * scale,
        height: canvasH * scale,
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  )
}
