import React from 'react'
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

export default function DragLayer({ scale }: Props) {
  const board = useLedStore((s) => s.board)
  const widgets = useLedStore((s) => s.widgets)
  const selectedId = useLedStore((s) => s.selectedId)
  const updateWidget = useLedStore((s) => s.updateWidget)
  const selectWidget = useLedStore((s) => s.selectWidget)

  const step = board.dotSize + board.dotGap

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
                const dotX = Math.max(0, Math.round(data!.x / scale / step))
                const dotY = Math.max(0, Math.round(data!.y / scale / step))
                updateWidget(w.id, { x: dotX, y: dotY })
              }}
              bounds="parent"
            >
              <div
                style={{
                  position: 'absolute',
                  width,
                  height,
                  border: isSelected ? '2px solid #7ec8ff' : '1px dashed rgba(255,255,255,0.25)',
                  boxSizing: 'border-box',
                  cursor: 'move',
                  pointerEvents: 'all',
                }}
                onClick={() => selectWidget(w.id === selectedId ? null : w.id)}
              >
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
                    }}
                  >
                    {w.type} ({w.x},{w.y})
                  </div>
                )}
              </div>
            </Draggable>
          )
        })}
    </div>
  )
}
