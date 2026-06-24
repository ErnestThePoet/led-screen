import { useLedStore } from '../store/useLedStore'
import ColorPicker from './ColorPicker'
import FontSelector from './FontSelector'
import PatternEditor from './PatternEditor'
import type { Board, DateTimeWidget, ClockWidget, ScrollTextWidget, PatternWidget, Widget } from '../types'

const labelStyle: React.CSSProperties = { fontSize: 12, color: '#aaa', marginBottom: 2, display: 'block' }
const inputStyle: React.CSSProperties = {
  background: '#222', color: '#fff', border: '1px solid #444',
  borderRadius: 4, padding: '4px 8px', fontSize: 13, width: '100%', boxSizing: 'border-box',
}
const sectionStyle: React.CSSProperties = { marginBottom: 16 }

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div style={sectionStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        style={inputStyle}
      />
    </div>
  )
}

function BoardPanel({ board, setBoard }: { board: Board; setBoard: (p: Partial<Board>) => void }) {
  return (
    <div>
      <h3 style={{ color: '#fff', fontSize: 14, marginTop: 0 }}>全局设置</h3>
      <NumberInput label="点阵宽度（列数）" value={board.width} min={8} max={256} onChange={(v) => setBoard({ width: v })} />
      <NumberInput label="点阵高度（行数）" value={board.height} min={8} max={128} onChange={(v) => setBoard({ height: v })} />
      <NumberInput label="点大小（px）" value={board.dotSize} min={2} max={32} onChange={(v) => setBoard({ dotSize: v })} />
      <NumberInput label="点间距（px）" value={board.dotGap} min={0} max={16} onChange={(v) => setBoard({ dotGap: v })} />
      <div style={sectionStyle}>
        <label style={labelStyle}>渲染模式</label>
        <select
          value={board.renderMode}
          onChange={(e) => setBoard({ renderMode: e.target.value as Board['renderMode'] })}
          style={inputStyle}
        >
          <option value="realistic">写实（发光）</option>
          <option value="clean">简洁（无光晕）</option>
        </select>
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>背景颜色</label>
        <ColorPicker value={board.backgroundColor} onChange={(c) => setBoard({ backgroundColor: c })} />
      </div>
    </div>
  )
}

function CommonFields({ widget, update }: { widget: Widget; update: (p: Partial<Widget>) => void }) {
  return (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>颜色</label>
        <ColorPicker value={widget.color} onChange={(c) => update({ color: c })} />
      </div>
      <NumberInput label="X（列，点）" value={widget.x} min={0} onChange={(v) => update({ x: v })} />
      <NumberInput label="Y（行，点）" value={widget.y} min={0} onChange={(v) => update({ y: v })} />
      <NumberInput label="宽度（点）" value={widget.width} min={1} onChange={(v) => update({ width: v })} />
      <NumberInput label="高度（点）" value={widget.height} min={1} onChange={(v) => update({ height: v })} />
      <NumberInput label="层级（zIndex）" value={widget.zIndex} onChange={(v) => update({ zIndex: v })} />
    </>
  )
}

function DateTimePanel({ widget, update }: { widget: DateTimeWidget; update: (p: Partial<Widget>) => void }) {
  return (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>时间格式（dayjs）</label>
        <input type="text" value={widget.format} onChange={(e) => update({ format: e.target.value } as any)} style={inputStyle} />
        <span style={{ fontSize: 11, color: '#666' }}>如 HH:mm:ss · YYYY-MM-DD · dddd</span>
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>字体</label>
        <FontSelector value={widget.font} onChange={(f) => update({ font: f } as any)} />
      </div>
      <NumberInput label="字号（px）" value={widget.fontSize} min={6} max={256} onChange={(v) => update({ fontSize: v } as any)} />
      <CommonFields widget={widget} update={update} />
    </>
  )
}

function ClockPanel({ widget, update }: { widget: ClockWidget; update: (p: Partial<Widget>) => void }) {
  return (
    <>
      <div style={sectionStyle}>
        <label style={{ ...labelStyle, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={widget.showSecondHand}
            onChange={(e) => update({ showSecondHand: e.target.checked } as any)}
          />
          显示秒针
        </label>
      </div>
      <CommonFields widget={widget} update={update} />
    </>
  )
}

function ScrollTextPanel({ widget, update }: { widget: ScrollTextWidget; update: (p: Partial<Widget>) => void }) {
  const updateItems = (items: string[]) => update({ items } as any)

  return (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>滚动文字列表（每行一条）</label>
        <textarea
          value={widget.items.join('\n')}
          onChange={(e) => updateItems(e.target.value.split('\n'))}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
        />
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>滚动方向</label>
        <select value={widget.direction} onChange={(e) => update({ direction: e.target.value as any } as any)} style={inputStyle}>
          <option value="left">← 向左</option>
          <option value="right">→ 向右</option>
          <option value="up">↑ 向上</option>
          <option value="down">↓ 向下</option>
        </select>
      </div>
      <NumberInput label="速度（px/s）" value={widget.speed} min={10} max={500} onChange={(v) => update({ speed: v } as any)} />
      <NumberInput label="停顿时长（ms）" value={widget.pauseMs} min={0} max={10000} onChange={(v) => update({ pauseMs: v } as any)} />
      <div style={sectionStyle}>
        <label style={labelStyle}>字体</label>
        <FontSelector value={widget.font} onChange={(f) => update({ font: f } as any)} />
      </div>
      <NumberInput label="字号（px）" value={widget.fontSize} min={6} max={256} onChange={(v) => update({ fontSize: v } as any)} />
      <CommonFields widget={widget} update={update} />
    </>
  )
}

function PatternPanel({ widget, update }: { widget: PatternWidget; update: (p: Partial<Widget>) => void }) {
  return (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>点阵绘制</label>
        <PatternEditor dots={widget.dots} onChange={(dots) => update({ dots } as any)} />
      </div>
      <CommonFields widget={widget} update={update} />
    </>
  )
}

export default function PropertyPanel() {
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)
  const selectedId = useLedStore((s) => s.selectedId)
  const setBoard = useLedStore((s) => s.setBoard)
  const updateWidget = useLedStore((s) => s.updateWidget)

  const selected = widgets.find((w) => w.id === selectedId)
  const update = (patch: Partial<Widget>) => {
    if (selected) updateWidget(selected.id, patch)
  }

  const panelStyle: React.CSSProperties = {
    padding: 16,
    overflowY: 'auto',
    height: '100%',
    boxSizing: 'border-box',
    color: '#fff',
  }

  if (!selected) {
    return (
      <div style={panelStyle}>
        <BoardPanel board={board} setBoard={setBoard} />
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      <h3 style={{ color: '#fff', fontSize: 14, marginTop: 0 }}>
        {selected.type === 'datetime' && '日期时间'}
        {selected.type === 'clock' && '模拟时钟'}
        {selected.type === 'scrolltext' && '滚动文字'}
        {selected.type === 'pattern' && '自定义图案'}
      </h3>
      {selected.type === 'datetime' && <DateTimePanel widget={selected as DateTimeWidget} update={update} />}
      {selected.type === 'clock' && <ClockPanel widget={selected as ClockWidget} update={update} />}
      {selected.type === 'scrolltext' && <ScrollTextPanel widget={selected as ScrollTextWidget} update={update} />}
      {selected.type === 'pattern' && <PatternPanel widget={selected as PatternWidget} update={update} />}
    </div>
  )
}
