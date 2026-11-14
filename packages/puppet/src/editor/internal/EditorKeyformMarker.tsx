import {EditorDiamondButton} from '../../design-system'
import {createSignal, onCleanup, Show} from 'solid-js'

import type {PuppetParameter} from '../../player/document'
import {
  getParameterKeyboardValue,
  getParameterPointerValue,
  getParameterProgress,
} from './parameter-value'

export interface EditorKeyformMarkerProps {
  /** 숫자 눈금을 별도로 그리면 false로 생략한다. 생략하면 표시하며 드래그 중에는 항상 표시한다. */
  readonly showValue?: boolean
  /** 표시 대상 이름. 생략하면 키폼이다. */
  readonly label?: string
  readonly active: boolean
  readonly onContextMenu?: () => void
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
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      props.onContextMenu?.()
    }
    if (
      event.button !== 0 ||
      event.isPrimary === false ||
      removePointerListeners !== undefined ||
      props.onMove === undefined
    ) {
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

    const cancel = () => finishPointerDrag(false)
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancel()
      }
    }
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.focus()
    props.onSelect?.()
    // The stored callback only removes native gesture listeners during completion or cleanup.
    // eslint-disable-next-line solid/reactivity
    removePointerListeners = () => {
      globalThis.removeEventListener('blur', cancel)
      globalThis.removeEventListener('keydown', handleEscape)
      globalThis.removeEventListener('pointercancel', handlePointerCancel)
      globalThis.removeEventListener('pointermove', handlePointerMove)
      globalThis.removeEventListener('pointerup', handlePointerUp)
      removePointerListeners = undefined
    }
    globalThis.addEventListener('blur', cancel)
    globalThis.addEventListener('keydown', handleEscape)
    globalThis.addEventListener('pointercancel', handlePointerCancel)
    globalThis.addEventListener('pointermove', handlePointerMove)
    globalThis.addEventListener('pointerup', handlePointerUp)
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
    <EditorDiamondButton
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
      aria-label={`${props.parameter.name} ${displayValue()} ${props.label ?? '키폼'}`}
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
      onContextMenu={() => props.onContextMenu?.()}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
    >
      <Show when={props.showValue !== false || dragValue() !== null}>
        <span>{displayValue()}</span>
      </Show>
    </EditorDiamondButton>
  )
}
