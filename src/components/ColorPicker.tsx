type Props = {
  value: string
  onChange: (color: string) => void
}

const PRESET_COLORS = [
  { label: '红', value: '#ff0000' },
  { label: '绿', value: '#00ff00' },
  { label: '蓝', value: '#0000ff' },
  { label: '黄', value: '#ffff00' },
  { label: '白', value: '#ffffff' },
  { label: '橙', value: '#ff8800' },
  { label: '青', value: '#00ffff' },
  { label: '紫', value: '#ff00ff' },
]

export default function ColorPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PRESET_COLORS.map((c) => (
          <button
            key={c.value}
            title={c.label}
            onClick={() => onChange(c.value)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              backgroundColor: c.value,
              border: value === c.value ? '3px solid #fff' : '2px solid #444',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 36, height: 28, padding: 0, border: 'none', cursor: 'pointer', borderRadius: 4 }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
          }}
          style={{
            width: 90,
            background: '#222',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 4,
            padding: '4px 8px',
            fontFamily: 'monospace',
            fontSize: 13,
          }}
        />
      </div>
    </div>
  )
}
