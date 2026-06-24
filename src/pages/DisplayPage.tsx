import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLedStore } from '../store/useLedStore'
import LedCanvas from '../components/LedCanvas'

export default function DisplayPage() {
  const navigate = useNavigate()
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)

  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [btnVisible, setBtnVisible] = useState(false)

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const step = board.dotSize + board.dotGap
  const canvasW = board.width * step
  const canvasH = board.height * step

  // Scale canvas to fill viewport while maintaining aspect ratio
  const scale = Math.min(windowSize.w / canvasW, windowSize.h / canvasH)

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

      {/* Invisible hover-trigger zone in the top-right corner.
          Moving the mouse into this 80×80 px area reveals the config button. */}
      <div
        onMouseEnter={() => setBtnVisible(true)}
        onMouseLeave={() => setBtnVisible(false)}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          zIndex: 99,
        }}
      >
        <button
          onClick={() => navigate('/config')}
          style={{
            position: 'absolute',
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
            opacity: btnVisible ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: btnVisible ? 'auto' : 'none',
          }}
        >
          ⚙ 配置
        </button>
      </div>
    </div>
  )
}
