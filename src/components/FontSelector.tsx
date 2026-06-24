type Props = {
  value: string
  onChange: (font: string) => void
}

const PIXEL_FONTS = ['Press Start 2P', 'Silkscreen', 'VT323']
const SYSTEM_FONTS = ['Arial', 'Georgia', 'Courier New', 'SimHei']

export default function FontSelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: '#222',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: 4,
        padding: '4px 8px',
        fontSize: 13,
        width: '100%',
      }}
    >
      <optgroup label="像素字体">
        {PIXEL_FONTS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </optgroup>
      <optgroup label="系统字体">
        {SYSTEM_FONTS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </optgroup>
    </select>
  )
}
