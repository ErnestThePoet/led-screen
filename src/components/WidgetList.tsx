import { useLedStore } from '../store/useLedStore'
import type { Widget, WidgetType } from '../types'

const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  datetime: '⏱ 日期时间',
  clock: '🕐 模拟时钟',
  scrolltext: '📜 滚动文字',
  pattern: '🎨 自定义图案',
}

const ADD_TYPES: WidgetType[] = ['datetime', 'clock', 'scrolltext', 'pattern']

export default function WidgetList() {
  const widgets = useLedStore((s) => s.widgets)
  const selectedId = useLedStore((s) => s.selectedId)
  const addWidget = useLedStore((s) => s.addWidget)
  const removeWidget = useLedStore((s) => s.removeWidget)
  const updateWidget = useLedStore((s) => s.updateWidget)
  const selectWidget = useLedStore((s) => s.selectWidget)

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#111',
    borderRight: '1px solid #333',
  }

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #333',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
  }

  const addSection: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  }

  const addBtnStyle: React.CSSProperties = {
    background: '#1e3a5f',
    color: '#7ec8ff',
    border: '1px solid #2a5a8f',
    borderRadius: 4,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 11,
  }

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
  }

  const itemStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    gap: 8,
    cursor: 'pointer',
    background: selected ? '#1a2a3a' : 'transparent',
    borderBottom: '1px solid #1a1a1a',
    color: '#ddd',
    fontSize: 12,
  })

  const iconBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    fontSize: 14,
    lineHeight: 1,
    color: '#888',
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>部件列表</div>

      <div style={addSection}>
        {ADD_TYPES.map((type) => (
          <button key={type} style={addBtnStyle} onClick={() => addWidget(type)}>
            + {type === 'datetime' ? '时间' : type === 'clock' ? '时钟' : type === 'scrolltext' ? '文字' : '图案'}
          </button>
        ))}
      </div>

      <div style={listStyle}>
        {widgets.length === 0 && (
          <p style={{ color: '#555', fontSize: 12, padding: '16px 12px', textAlign: 'center' }}>
            点击上方按钮添加部件
          </p>
        )}
        {[...widgets].reverse().map((w: Widget) => (
          <div
            key={w.id}
            style={itemStyle(w.id === selectedId)}
            onClick={() => selectWidget(w.id === selectedId ? null : w.id)}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {WIDGET_TYPE_LABELS[w.type]}
            </span>
            <button
              style={{ ...iconBtnStyle, color: w.visible ? '#7ec8ff' : '#555' }}
              title={w.visible ? '隐藏' : '显示'}
              onClick={(e) => { e.stopPropagation(); updateWidget(w.id, { visible: !w.visible }) }}
            >
              {w.visible ? '👁' : '🚫'}
            </button>
            <button
              style={{ ...iconBtnStyle, color: '#ff6666' }}
              title="删除"
              onClick={(e) => { e.stopPropagation(); removeWidget(w.id) }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
