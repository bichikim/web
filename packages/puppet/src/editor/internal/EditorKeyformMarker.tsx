import {createSignal, onCleanup} from 'solid-js'

import type {PuppetParameter} from '../../player/document'
import {
  getParameterKeyboardValue,
  getParameterPointerValue,
  getParameterProgress,
} from './parameter-value'

export interface EditorKeyformMarkerProps {
  readonly active: boolean
  readonly onMove?: (value: number, nextValue: number) => void
  readonly onSelect?: () => void
  readonly parameter: PuppetParameter
  readonly value: number
}

export const EditorKeyformMarker = (props: EditorKeyformMarkerProps) => {
  const [dragValue, setDragValue] = createSignal<number | null>(null)
  let removePointerListeners: (() => void) | undefined
  const displayValue = () => dragValue() ?? props.value
  const finishPointerDrag = (commit: boolean) => {
    const nextValue = dragValue()
    removePointerListeners?.()
    setDragValue(null)

    if (commit && nextValue !== null && nextValue !== props.value) {
      props.onMove?.(props.value, nextValue)
    }
  }
  const handlePointerDown = (event: PointerEvent & {readonly currentTarget: HTMLButtonElement}) => {
    if (event.button !== 0 || props.onMove === undefined) {
      return
    }

    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    if (bounds === undefined) {
      return
    }

    const {pointerId} = event
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }

      moveEvent.preventDefault()
      setDragValue(
        getParameterPointerValue(props.parameter, bounds.left, bounds.width, moveEvent.clientX),
      )
    }
    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === pointerId) {
        finishPointerDrag(true)
      }
    }
    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) {
        finishPointerDrag(false)
      }
    }

    event.preventDefault()
    event.stopPropagation()
    props.onSelect?.()
    removePointerListeners?.()
    // The stored callback only removes native gesture listeners during completion or cleanup.
    // eslint-disable-next-line solid/reactivity
    removePointerListeners = () => {
      window.removeEventListener('pointercancel', handlePointerCancel)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      removePointerListeners = undefined
    }
    window.addEventListener('pointercancel', handlePointerCancel)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (props.onMove === undefined) {
      return
    }

    const nextValue = getParameterKeyboardValue(props.parameter, props.value, event.key)
    if (nextValue === undefined || nextValue === props.value) {
      return
    }

    event.preventDefault()
    props.onSelect?.()
    props.onMove(props.value, nextValue)
  }

  onCleanup(() => removePointerListeners?.())

  return (
    <button
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
      aria-label={`${props.parameter.name} ${displayValue()} 키폼`}
      aria-pressed={props.active}
      class="keyform-marker"
      classList={{draggable: props.onMove !== undefined, dragging: dragValue() !== null}}
      style={{left: `${getParameterProgress(props.parameter, displayValue())}%`}}
      type="button"
      onClick={(event) => {
        if (event.detail === 0 || props.onMove === undefined) {
          props.onSelect?.()
        }
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
    >
      <span>{displayValue()}</span>
    </button>
  )
}
