import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Board, Widget, WidgetBase, WidgetType, LedConfig } from '../types'

const DEFAULT_BOARD: Board = {
  width: 128,
  height: 64,
  dotSize: 8,
  dotGap: 2,
  renderMode: 'realistic',
  backgroundColor: '#000000',
}

function makeBase(type: WidgetType): WidgetBase {
  return {
    id: uuidv4(),
    type,
    x: 0,
    y: 0,
    width: 32,
    height: 16,
    color: '#ff0000',
    visible: true,
    zIndex: 0,
  }
}

function createDefaultWidget(type: WidgetType): Widget {
  switch (type) {
    case 'datetime':
      return { ...makeBase('datetime'), type: 'datetime', format: 'HH:mm:ss', font: 'Press Start 2P', fontSize: 12, locale: 'en' as const }
    case 'clock':
      return { ...makeBase('clock'), type: 'clock', width: 24, height: 24, showSecondHand: true }
    case 'scrolltext':
      return {
        ...makeBase('scrolltext'),
        type: 'scrolltext',
        items: ['Hello LED!'],
        speed: 60,
        direction: 'left',
        font: 'Press Start 2P',
        fontSize: 14,
        pauseMs: 1000,
      }
    case 'pattern':
      return {
        ...makeBase('pattern'),
        type: 'pattern',
        dots: Array.from({ length: 16 }, () => Array<boolean>(32).fill(false)),
      }
  }
}

type LedStore = {
  board: Board
  widgets: Widget[]
  selectedId: string | null
  customFonts: string[]
  setBoard: (patch: Partial<Board>) => void
  addWidget: (type: WidgetType) => void
  updateWidget: (id: string, patch: Partial<Widget>) => void
  removeWidget: (id: string) => void
  selectWidget: (id: string | null) => void
  setWidgets: (widgets: Widget[]) => void
  setConfig: (config: Pick<LedConfig, 'board' | 'widgets'> & { customFonts?: string[] }) => void
  addCustomFont: (font: string) => void
  removeCustomFont: (font: string) => void
}

export const useLedStore = create<LedStore>((set) => ({
  board: DEFAULT_BOARD,
  widgets: [],
  selectedId: null,
  customFonts: [],
  setBoard: (patch) => set((s) => ({ board: { ...s.board, ...patch } })),
  addWidget: (type) =>
    set((s) => ({
      widgets: [...s.widgets, createDefaultWidget(type)],
    })),
  updateWidget: (id, patch) =>
    set((s) => ({
      widgets: s.widgets.map((w) => (w.id === id ? ({ ...w, ...patch } as Widget) : w)),
    })),
  removeWidget: (id) =>
    set((s) => ({
      widgets: s.widgets.filter((w) => w.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  selectWidget: (id) => set({ selectedId: id }),
  setWidgets: (widgets) => set({ widgets }),
  setConfig: ({ board, widgets, customFonts }) =>
    set({ board, widgets, customFonts: customFonts ?? [], selectedId: null }),
  addCustomFont: (font) =>
    set((s) => ({
      customFonts: s.customFonts.includes(font) ? s.customFonts : [...s.customFonts, font],
    })),
  removeCustomFont: (font) =>
    set((s) => ({ customFonts: s.customFonts.filter((f) => f !== font) })),
}))
