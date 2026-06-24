import React, { useRef } from 'react'
import DraggableLib from 'react-draggable'
import type { DraggableProps } from 'react-draggable'
import { useLedStore } from '../store/useLedStore'
import type { Widget } from '../types'

// react-draggable v4 class component has strict `props` typing that conflicts
// with JSX usage; cast to a functional component signature to allow partial props.
const Draggable = DraggableLib as unknown as React.FC<Partial<DraggableProps> & { key?: string }>

type Props = {
  /** Visual scale: previewPixels / actualCanvasPixels */
  scale: number
}

type ResizeState = {
  widgetId: string
  handle: string // 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
  startX: number
  startY: number
  startWidgetX: number
  startWidgetY: number
  startWidgetW: number
  startWidgetH: number
}

/** Returns the CSS cursor for each handle direction. */
function handleCursor(handle: string): string {
  const map: Record<string, string> = {
    n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
    ne: 'ne-resize', nw: 'nw-resize', se: 'se-resize', sw: 'sw-resize',
  }
  return map[handle] ?? 'default'
}

/** Positions (in %) for each handle on its axis. */
const HANDLES: { id: string; top: string; left: string }[] = [
  { id: 'nw', top: '-4px', left: '-4px' },
  { id: 'n',  top: '-4px', left: 'calc(50% - 4px)' },
  { id: 'ne', top: '-4px', left: 'calc(100% - 4px)' },
  { id: 'w',  top: 'calc(50% - 4px)', left: '-4px' },
  { id: 'e',  top: 'calc(50% - 4px)', left: 'calc(100% - 4px)' },
  { id: 'sw', top: 'calc(100% - 4px)', left: '-4px' },
  { id: 's',  top: 'calc(100% - 4px)', left: 'calc(50% - 4px)' },
  { id: 'se', top: 'calc(100% - 4px)', left: 'calc(100% - 4px)' },
]

export default function DragLayer({ scale }: Props) {
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)
  const selectedId = useLedStore((s) => s.selectedId)
  const updateWidget = useLedStore((s) => s.updateWidget)
  const selectWidget = useLedStore((s) => s.selectWidget)

  const step = board.dotSize + board.dotGap
  const resizingRef = useRef<ResizeState | null>(null)

  /** Start resizing: attach global mouse listeners for smooth cross-element tracking. */
  const handleResizeStart = (
    e: React.MouseEvent,
    widget: Widget,
    handle: string
  ) => {
    e.stopPropagation()
    e.preventDefault()

    resizingRef.current = {
      widgetId: widget.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidgetX: widget.x,
      startWidgetY: widget.y,
      startWidgetW: widget.width,
      startWidgetH: widget.height,
    }

    // Define move/end inside start so they share the same closure reference
    // (required for removeEventListener to match).
    const onMove = (ev: MouseEvent) => {
      const r = resizingRef.current
      if (!r) return

      // Convert screen-pixel delta → LED dot-grid units
      const dx = Math.round((ev.clientX - r.startX) / (scale * step))
      const dy = Math.round((ev.clientY - r.startY) / (scale * step))

      let newX = r.startWidgetX
      let newY = r.startWidgetY
      let newW = r.startWidgetW
      let newH = r.startWidgetH

      if (r.handle.includes('e')) newW = Math.max(1, r.startWidgetW + dx)
      if (r.handle.includes('s')) newH = Math.max(1, r.startWidgetH + dy)
      if (r.handle.includes('w')) {
        const raw = Math.max(1, r.startWidgetW - dx)
        newX = r.startWidgetX + (r.startWidgetW - raw)
        newW = raw
      }
      if (r.handle.includes('n')) {
        const raw = Math.max(1, r.startWidgetH - dy)
        newY = r.startWidgetY + (r.startWidgetH - raw)
        newH = raw
      }

      // Clamp within board bounds
      newX = Math.max(0, Math.min(newX, board.width - 1))
      newY = Math.max(0, Math.min(newY, board.height - 1))
      newW = Math.min(newW, board.width - newX)
      newH = Math.min(newH, board.height - newY)

      updateWidget(r.widgetId, { x: newX, y: newY, width: newW, height: newH })
    }

    const onEnd = () => {
      resizingRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: board.width * step * scale,
        height: board.height * step * scale,
        pointerEvents: 'none',
      }}
    >
      {widgets
        .filter((w) => w.visible)
        .map((w: Widget) => {
          const x = w.x * step * scale
          const y = w.y * step * scale
          const width = w.width * step * scale
          const height = w.height * step * scale
          const isSelected = w.id === selectedId

          return (
            <Draggable
              key={w.id}
              position={{ x, y }}
              onStop={(_e, data) => {
                const dotX = Math.min(
                  Math.max(0, Math.round(data!.x / scale / step)),
                  board.width - w.width
                )
                const dotY = Math.min(
                  Math.max(0, Math.round(data!.y / scale / step)),
                  board.height - w.height
                )
                updateWidget(w.id, { x: dotX, y: dotY })
              }}
              bounds="parent"
            >
              <div
                style={{
                  position: 'absolute',
                  width,
                  height,
                  border: isSelected
                    ? '2px solid #7ec8ff'
                    : '1px dashed rgba(255,255,255,0.25)',
                  boxSizing: 'border-box',
                  cursor: 'move',
                  pointerEvents: 'all',
                }}
                onClick={() => selectWidget(w.id === selectedId ? null : w.id)}
              >
                {/* Widget label (shown when selected) */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -18,
                      left: 0,
                      background: '#1e3a5f',
                      color: '#7ec8ff',
                      fontSize: 10,
                      padding: '1px 4px',
                      borderRadius: 3,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    {w.type} ({w.x},{w.y}) {w.width}×{w.height}
                  </div>
                )}

                {/* Resize handles — only on the selected widget */}
                {isSelected &&
                  HANDLES.map(({ id, top, left }) => (
                    <div
                      key={id}
                      onMouseDown={(e) => handleResizeStart(e, w, id)}
                      style={{
                        position: 'absolute',
                        top,
                        left,
                        width: 8,
                        height: 8,
                        background: '#7ec8ff',
                        border: '1px solid #1e3a5f',
                        borderRadius: 2,
                        boxSizing: 'border-box',
                        cursor: handleCursor(id),
                        zIndex: 10,
                      }}
                    />
                  ))}
              </div>
            </Draggable>
          )
        })}
    </div>
  )
}
