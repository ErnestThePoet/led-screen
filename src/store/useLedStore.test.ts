import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useLedStore } from './useLedStore'

beforeEach(() => {
  // Reset store between tests
  useLedStore.setState({
    board: {
      width: 128, height: 64, dotSize: 8, dotGap: 2,
      renderMode: 'realistic', backgroundColor: '#000000',
    },
    widgets: [],
    selectedId: null,
    customFonts: [],
  })
})

describe('useLedStore', () => {
  it('has default board with width 128', () => {
    expect(useLedStore.getState().board.width).toBe(128)
  })

  it('addWidget creates a datetime widget with required fields', () => {
    act(() => { useLedStore.getState().addWidget('datetime') })
    const w = useLedStore.getState().widgets[0]
    expect(w.type).toBe('datetime')
    expect(w.id).toBeTruthy()
    expect(typeof (w as any).format).toBe('string')
  })

  it('removeWidget deletes the widget and clears selectedId', () => {
    act(() => { useLedStore.getState().addWidget('clock') })
    const id = useLedStore.getState().widgets[0].id
    act(() => { useLedStore.getState().selectWidget(id) })
    act(() => { useLedStore.getState().removeWidget(id) })
    expect(useLedStore.getState().widgets).toHaveLength(0)
    expect(useLedStore.getState().selectedId).toBeNull()
  })

  it('updateWidget patches only the specified fields', () => {
    act(() => { useLedStore.getState().addWidget('scrolltext') })
    const id = useLedStore.getState().widgets[0].id
    act(() => { useLedStore.getState().updateWidget(id, { color: '#00ff00' }) })
    expect(useLedStore.getState().widgets[0].color).toBe('#00ff00')
    expect(useLedStore.getState().widgets[0].type).toBe('scrolltext')
  })

  it('setConfig replaces board and widgets', () => {
    const newBoard = { width: 64, height: 32, dotSize: 6, dotGap: 1, renderMode: 'clean' as const, backgroundColor: '#111111' }
    act(() => { useLedStore.getState().setConfig({ board: newBoard, widgets: [] }) })
    expect(useLedStore.getState().board.width).toBe(64)
    expect(useLedStore.getState().selectedId).toBeNull()
  })
})

describe('customFonts', () => {
  it('addCustomFont adds a new font name to the list', () => {
    act(() => { useLedStore.getState().addCustomFont('Comic Sans MS') })
    expect(useLedStore.getState().customFonts).toContain('Comic Sans MS')
  })

  it('addCustomFont does not add duplicate font names', () => {
    act(() => { useLedStore.getState().addCustomFont('Arial') })
    act(() => { useLedStore.getState().addCustomFont('Arial') })
    expect(useLedStore.getState().customFonts.filter((f) => f === 'Arial')).toHaveLength(1)
  })

  it('removeCustomFont removes an existing font name', () => {
    act(() => { useLedStore.getState().addCustomFont('Georgia') })
    act(() => { useLedStore.getState().removeCustomFont('Georgia') })
    expect(useLedStore.getState().customFonts).not.toContain('Georgia')
  })

  it('removeCustomFont is safe when font name does not exist', () => {
    expect(() => {
      act(() => { useLedStore.getState().removeCustomFont('nonexistent') })
    }).not.toThrow()
  })

  it('setConfig with customFonts restores the list', () => {
    const board = useLedStore.getState().board
    act(() => { useLedStore.getState().setConfig({ board, widgets: [], customFonts: ['Papyrus'] }) })
    expect(useLedStore.getState().customFonts).toEqual(['Papyrus'])
  })

  it('setConfig without customFonts defaults to empty array', () => {
    const board = useLedStore.getState().board
    act(() => { useLedStore.getState().addCustomFont('Wingdings') })
    act(() => { useLedStore.getState().setConfig({ board, widgets: [] }) })
    expect(useLedStore.getState().customFonts).toEqual([])
  })
})
