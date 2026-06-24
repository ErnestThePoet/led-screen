import { describe, it, expect } from 'vitest'
import { parseConfig } from './configIO'
import type { LedConfig } from '../types'

const validConfig: LedConfig = {
  version: '1.0',
  board: { width: 128, height: 64, dotSize: 8, dotGap: 2, renderMode: 'realistic', backgroundColor: '#000000' },
  widgets: [],
}

describe('parseConfig', () => {
  it('returns config object for valid JSON', () => {
    const result = parseConfig(JSON.stringify(validConfig))
    expect(result).not.toBeNull()
    expect(result?.board.width).toBe(128)
  })

  it('returns null for invalid JSON', () => {
    expect(parseConfig('not json')).toBeNull()
  })

  it('returns null if version is missing', () => {
    const bad = { ...validConfig, version: undefined }
    expect(parseConfig(JSON.stringify(bad))).toBeNull()
  })

  it('returns null if board is missing', () => {
    const bad = { version: '1.0', widgets: [] }
    expect(parseConfig(JSON.stringify(bad))).toBeNull()
  })

  it('returns null if widgets is not an array', () => {
    const bad = { ...validConfig, widgets: 'bad' }
    expect(parseConfig(JSON.stringify(bad))).toBeNull()
  })
})
