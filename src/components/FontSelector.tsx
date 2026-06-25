import { useState } from 'react'

type Props = {
  value: string
  onChange: (font: string) => void
  customFonts?: string[]
  onAddCustomFont?: (font: string) => void
  onRemoveCustomFont?: (font: string) => void
}

const PIXEL_FONTS = [
  'Press Start 2P', 'Silkscreen', 'VT323',
  'Orbitron', 'Share Tech Mono', 'Nova Mono', 'Audiowide',
]

const CHINESE_FONTS = [
  'Noto Sans SC', 'Noto Serif SC',
  'SimHei', 'Microsoft YaHei', 'SimSun', 'KaiTi',
]

function isFontAvailable(fontName: string): boolean {
  return document.fonts.check(`16px "${fontName}"`)
}

export default function FontSelector({
  value,
  onChange,
  customFonts = [],
  onAddCustomFont,
  onRemoveCustomFont,
}: Props) {
  const [input, setInput] = useState('')
  const [warnedFont, setWarnedFont] = useState<string | null>(null)

  const selectStyle: React.CSSProperties = {
    background: '#222',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 13,
    width: '100%',
  }

  const handleAdd = () => {
    const name = input.trim()
    if (!name) return

    // Already in list: just select it
    if (customFonts.includes(name)) {
      onChange(name)
      setInput('')
      setWarnedFont(null)
      return
    }

    // Second click on same warned font: force save
    if (warnedFont === name) {
      onAddCustomFont?.(name)
      onChange(name)
      setInput('')
      setWarnedFont(null)
      return
    }

    if (!isFontAvailable(name)) {
      setWarnedFont(name)
      return
    }

    onAddCustomFont?.(name)
    onChange(name)
    setInput('')
    setWarnedFont(null)
  }

  return (
    <div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        <optgroup label="像素字体">
          {PIXEL_FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </optgroup>
        <optgroup label="中文字体">
          {CHINESE_FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </optgroup>
        {customFonts.length > 0 && (
          <optgroup label="自定义">
            {customFonts.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </optgroup>
        )}
      </select>

      {onAddCustomFont && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              placeholder="输入字体名…"
              value={input}
              onChange={(e) => { setInput(e.target.value); setWarnedFont(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              style={{
                flex: 1,
                background: '#222',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 13,
              }}
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              style={{
                background: input.trim() ? '#1e3a5f' : '#1a1a1a',
                color: input.trim() ? '#7ec8ff' : '#555',
                border: '1px solid #2a5a8f',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              + 添加
            </button>
          </div>

          {warnedFont && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#f0a060' }}>
              ⚠ 字体"{warnedFont}"不可用，再次点击「+ 添加」强制保存
            </p>
          )}

          {customFonts.length > 0 && onRemoveCustomFont && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {customFonts.map((f) => (
                <span
                  key={f}
                  style={{
                    background: '#333',
                    border: '1px solid #555',
                    borderRadius: 3,
                    padding: '2px 6px',
                    fontSize: 11,
                    color: '#ccc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {f}
                  <button
                    onClick={() => onRemoveCustomFont(f)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#888',
                      padding: 0,
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
