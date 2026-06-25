import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLedStore } from '../store/useLedStore'
import LedCanvas from '../components/LedCanvas'
import DragLayer from '../components/DragLayer'
import WidgetList from '../components/WidgetList'
import PropertyPanel from '../components/PropertyPanel'
import { exportConfig, importConfig } from '../utils/configIO'

const PREVIEW_MAX_W = 640
const PREVIEW_MAX_H = 380

export default function ConfigPage() {
  const navigate = useNavigate()
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)
  const setConfig = useLedStore((s) => s.setConfig)
  const customFonts = useLedStore((s) => s.customFonts)   // ← 新增
  const fileInputRef = useRef<HTMLInputElement>(null)

  const step = board.dotSize + board.dotGap
  const actualW = board.width * step
  const actualH = board.height * step
  const scaleX = PREVIEW_MAX_W / actualW
  const scaleY = PREVIEW_MAX_H / actualH
  const scale = Math.min(scaleX, scaleY, 1)

  const handleExport = () => exportConfig(board, widgets, customFonts)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const config = await importConfig(file)
    if (config) {
      setConfig({ board: config.board, widgets: config.widgets, customFonts: config.customFonts })
    } else {
      alert('配置文件格式无效，请检查文件内容。')
    }
    e.target.value = ''
  }

  const pageStyle: React.CSSProperties = {
    display: 'flex',
    height: '100vh',
    background: '#0a0a0a',
    overflow: 'hidden',
  }

  const leftStyle: React.CSSProperties = {
    width: 200,
    minWidth: 180,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  }

  const centerStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  }

  const rightStyle: React.CSSProperties = {
    width: 280,
    minWidth: 240,
    flexShrink: 0,
    borderLeft: '1px solid #333',
    overflowY: 'auto',
  }

  const topBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  }

  const btnStyle: React.CSSProperties = {
    background: '#1e3a5f',
    color: '#7ec8ff',
    border: '1px solid #2a5a8f',
    borderRadius: 5,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 12,
  }

  const previewWrapStyle: React.CSSProperties = {
    position: 'relative',
    width: actualW * scale,
    height: actualH * scale,
    flexShrink: 0,
    border: '1px solid #333',
  }

  return (
    <div style={pageStyle}>
      {/* Left: Widget List */}
      <div style={leftStyle}>
        <WidgetList />
      </div>

      {/* Center: Preview + toolbar */}
      <div style={centerStyle}>
        <div style={topBarStyle}>
          <button style={btnStyle} onClick={() => navigate('/')}>▶ 全屏展示</button>
          <button style={btnStyle} onClick={handleExport}>⬇ 导出配置</button>
          <label style={btnStyle}>
            ⬆ 导入配置
            <input
              ref={fileInputRef}
              type="file"
              accept=".ledjson,.json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </label>
        </div>

        <div style={previewWrapStyle}>
          <LedCanvas board={board} widgets={widgets} scale={scale} />
          <DragLayer scale={scale} />
        </div>

        <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
          拖动选框调整位置 · 点击选框选中部件 · 点击空白取消选中
        </p>
      </div>

      {/* Right: Properties */}
      <div style={rightStyle}>
        <PropertyPanel />
      </div>
    </div>
  )
}
