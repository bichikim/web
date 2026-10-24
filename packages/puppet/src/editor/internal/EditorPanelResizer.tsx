import {EDITOR_PANEL_SPECS, type EditorPanelPosition} from '../use-panel-layout'

export interface EditorPanelResizerProps {
  readonly dragging?: boolean
  readonly onResizeBy?: (delta: number) => void
  readonly onResizeStart?: (event: PointerEvent) => void
  readonly position: EditorPanelPosition
  readonly size: number
}

const getKeyboardDelta = (position: EditorPanelPosition, key: string) => {
  const increment = 16

  switch (key) {
    case 'ArrowDown':
      return position === 'bottom' ? -increment : null
    case 'ArrowLeft':
      return position === 'left' ? -increment : position === 'right' ? increment : null
    case 'ArrowRight':
      return position === 'left' ? increment : position === 'right' ? -increment : null
    case 'ArrowUp':
      return position === 'bottom' ? increment : null
    default:
      return null
  }
}

const PANEL_LABEL: Readonly<Record<EditorPanelPosition, string>> = {
  bottom: '아래 프레임 높이 조절',
  left: '왼쪽 패널 너비 조절',
  right: '오른쪽 패널 너비 조절',
}

export const EditorPanelResizer = (props: EditorPanelResizerProps) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const delta = getKeyboardDelta(props.position, event.key)

    if (delta !== null) {
      event.preventDefault()
      props.onResizeBy?.(delta)
    }
  }

  return (
    <div
      aria-label={PANEL_LABEL[props.position]}
      aria-orientation={props.position === 'bottom' ? 'horizontal' : 'vertical'}
      aria-valuemax={EDITOR_PANEL_SPECS[props.position].maximumSize}
      aria-valuemin={EDITOR_PANEL_SPECS[props.position].minimumSize}
      aria-valuenow={props.size}
      class={`panel-resizer ${props.position}`}
      classList={{dragging: props.dragging}}
      role="separator"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => props.onResizeStart?.(event)}
    />
  )
}
