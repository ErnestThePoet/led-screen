import { describe, it, expect } from 'vitest'
import { parseConfig, serializeConfig } from './configIO'
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

const testBoard: LedConfig['board'] = {
  width: 128, height: 64, dotSize: 8, dotGap: 2,
  renderMode: 'realistic', backgroundColor: '#000000',
}

describe('serializeConfig', () => {
  it('includes customFonts in the output when provided', () => {
    const json = serializeConfig(testBoard, [], ['Papyrus', 'Impact'])
    const result = JSON.parse(json)
    expect(result.customFonts).toEqual(['Papyrus', 'Impact'])
  })

  it('outputs customFonts as empty array when omitted', () => {
    const json = serializeConfig(testBoard, [])
    const result = JSON.parse(json)
    expect(result.customFonts).toEqual([])
  })

  it('output is valid for parseConfig round-trip', () => {
    const json = serializeConfig(testBoard, [], ['Comic Sans MS'])
    const parsed = parseConfig(json)
    expect(parsed).not.toBeNull()
    expect(parsed?.customFonts).toEqual(['Comic Sans MS'])
  })
})

describe('parseConfig with customFonts', () => {
  it('returns customFonts from config when present', () => {
    const config = { ...validConfig, customFonts: ['Comic Sans MS'] }
    const result = parseConfig(JSON.stringify(config))
    expect(result?.customFonts).toEqual(['Comic Sans MS'])
  })

  it('returns undefined for customFonts when field is absent (old config)', () => {
    const result = parseConfig(JSON.stringify(validConfig))
    expect(result?.customFonts).toBeUndefined()
  })
})
