export type RenderMode = 'realistic' | 'clean'

export type Board = {
  width: number
  height: number
  dotSize: number
  dotGap: number
  renderMode: RenderMode
  backgroundColor: string
}

export type WidgetType = 'datetime' | 'clock' | 'scrolltext' | 'pattern'

export type WidgetBase = {
  id: string
  type: WidgetType
  x: number
  y: number
  width: number
  height: number
  color: string
  visible: boolean
  zIndex: number
}

export type DateTimeWidget = WidgetBase & {
  type: 'datetime'
  format: string
  font: string
  fontSize: number
  /** Locale used for day-of-week / month names. 'zh-cn' enables 星期三 / 周三. */
  locale: 'en' | 'zh-cn'
}

export type ClockWidget = WidgetBase & {
  type: 'clock'
  showSecondHand: boolean
}

export type ScrollTextWidget = WidgetBase & {
  type: 'scrolltext'
  items: string[]
  speed: number
  direction: 'left' | 'right' | 'up' | 'down'
  font: string
  fontSize: number
  pauseMs: number
}

export type PatternWidget = WidgetBase & {
  type: 'pattern'
  dots: boolean[][]
}

export type Widget = DateTimeWidget | ClockWidget | ScrollTextWidget | PatternWidget

export type LedConfig = {
  version: '1.0'
  board: Board
  widgets: Widget[]
}
