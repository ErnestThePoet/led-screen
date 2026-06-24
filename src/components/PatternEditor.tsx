import { useRef, useEffect, useCallback } from 'react'
import { imageToPattern } from '../utils/imageToPattern'

type Props = {
  dots: boolean[][]
  onChange: (dots: boolean[][]) => void
}

const CELL_SIZE = 12

export default function PatternEditor({ dots, onChange }: Props) {
  const rows = dots.length
  const cols = dots[0]?.length ?? 0
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const drawModeRef = useRef<boolean>(true) // true = light, false = erase
  const thresholdRef = useRef(128)

  // Draw the grid
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = dots[r][c] ? '#ffffff' : '#1a1a1a'
        ctx.fillRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
      }
    }

    // Grid lines
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * CELL_SIZE)
      ctx.lineTo(cols * CELL_SIZE, r * CELL_SIZE)
      ctx.stroke()
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath()
      ctx.moveTo(c * CELL_SIZE, 0)
      ctx.lineTo(c * CELL_SIZE, rows * CELL_SIZE)
      ctx.stroke()
    }
  }, [dots, rows, cols])

  useEffect(() => { redraw() }, [redraw])

  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / CELL_SIZE)
    const row = Math.floor((e.clientY - rect.top) / CELL_SIZE)
    return { row, col }
  }

  const toggleCell = (row: number, col: number, lit: boolean) => {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return
    if (dots[row][col] === lit) return
    const next = dots.map((r, ri) => r.map((v, ci) => (ri === row && ci === col ? lit : v)))
    onChange(next)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    drawModeRef.current = e.button !== 2 // right click = erase
    const { row, col } = getCellFromEvent(e)
    toggleCell(row, col, drawModeRef.current)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const { row, col } = getCellFromEvent(e)
    toggleCell(row, col, drawModeRef.current)
  }

  const handleMouseUp = () => { isDrawingRef.current = false }

  const handleClear = () => {
    onChange(Array.from({ length: rows }, () => Array<boolean>(cols).fill(false)))
  }

  const handleInvert = () => {
    onChange(dots.map((r) => r.map((v) => !v)))
  }

  const handleImageImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const newDots = await imageToPattern(file, cols, rows, thresholdRef.current)
    onChange(newDots)
    e.target.value = ''
  }

  const buttonStyle: React.CSSProperties = {
    background: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ overflow: 'auto', maxWidth: 480, maxHeight: 320 }}>
        <canvas
          ref={canvasRef}
          width={cols * CELL_SIZE}
          height={rows * CELL_SIZE}
          style={{ cursor: 'crosshair', display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={buttonStyle} onClick={handleClear}>清除</button>
        <button style={buttonStyle} onClick={handleInvert}>反转</button>
        <label style={{ ...buttonStyle, display: 'inline-block' }}>
          导入图片
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageImport}
          />
        </label>
        <label style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6 }}>
          阈值
          <input
            type="range"
            min={0}
            max={255}
            defaultValue={128}
            onChange={(e) => { thresholdRef.current = Number(e.target.value) }}
            style={{ width: 80 }}
          />
        </label>
      </div>
      <p style={{ fontSize: 11, color: '#666', margin: 0 }}>左键绘制 · 右键擦除</p>
    </div>
  )
}
