import { useNavigate } from 'react-router-dom'
import { useLedStore } from '../store/useLedStore'
import LedCanvas from '../components/LedCanvas'

export default function DisplayPage() {
  const navigate = useNavigate()
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)

  const step = board.dotSize + board.dotGap
  const canvasW = board.width * step
  const canvasH = board.height * step

  // Scale canvas to fill viewport while maintaining aspect ratio
  const scaleX = window.innerWidth / canvasW
  const scaleY = window.innerHeight / canvasH
  const scale = Math.min(scaleX, scaleY)

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <LedCanvas board={board} widgets={widgets} scale={scale} />

      <button
        onClick={() => navigate('/config')}
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 6,
          padding: '6px 14px',
          cursor: 'pointer',
          fontSize: 13,
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      >
        ⚙ 配置
      </button>
    </div>
  )
}
