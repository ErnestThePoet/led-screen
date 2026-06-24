import type { Board, LedConfig, Widget } from '../types'

/** Validates and parses a JSON string into a LedConfig. Returns null if invalid. */
export function parseConfig(json: string): LedConfig | null {
  try {
    const obj = JSON.parse(json)
    if (obj.version !== '1.0') return null
    if (!obj.board || typeof obj.board !== 'object') return null
    if (!Array.isArray(obj.widgets)) return null
    const VALID_TYPES = ['datetime', 'clock', 'scrolltext', 'pattern']
    if (!obj.widgets.every((w: any) => w && VALID_TYPES.includes(w.type))) return null
    return obj as LedConfig
  } catch {
    return null
  }
}

/** Serializes board + widgets to a JSON string. */
export function serializeConfig(board: Board, widgets: Widget[]): string {
  const config: LedConfig = { version: '1.0', board, widgets }
  return JSON.stringify(config, null, 2)
}

/** Triggers a browser download of the config as a .ledjson file. */
export function exportConfig(board: Board, widgets: Widget[]): void {
  const content = serializeConfig(board, widgets)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'led-config.ledjson'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Reads a .ledjson file selected by the user.
 * Returns parsed config or null on failure.
 */
export async function importConfig(file: File): Promise<LedConfig | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      resolve(parseConfig(text))
    }
    reader.onerror = () => resolve(null)
    reader.readAsText(file)
  })
}
