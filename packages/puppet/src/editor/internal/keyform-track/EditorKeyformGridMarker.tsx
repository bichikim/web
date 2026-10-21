import {createSignal, onCleanup} from 'solid-js'
import {EditorDiamondButton} from '../../../design-system'
import {parameterValuesEqual, type PuppetParameterValues} from '../../../deformation'
import type {PuppetParameter, PuppetParameterKeyform} from '../../../player/document'
import {
  getParameterKeyboardValue,
  getParameterPointerValue,
  getParameterProgress,
} from '../parameter-value'
import {isTouchContextRequest} from './is-touch-context-request'

export interface EditorKeyformGridMarkerProps {
  readonly active?: boolean
  readonly keyform: PuppetParameterKeyform
  readonly onContextMenu?: () => void
  readonly onMove?: (from: PuppetParameterValues, to: PuppetParameterValues) => void
  readonly onSelect?: () => void
  readonly parameters: ReadonlyArray<PuppetParameter>
}

const isUnmodifiedKeypress = (event: KeyboardEvent) =>
  !(
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )

export const EditorKeyformGridMarker = (props: EditorKeyformGridMarkerProps) => {
  const [dragValues, setDragValues] = createSignal<PuppetParameterValues | null>(null)
  let removePointerListeners: (() => void) | undefined
  const values = () => dragValues() ?? props.keyform.values
  const x = () => props.parameters[0]
  const y = () => props.parameters[1]
  const handleClick = (event: MouseEvent & {readonly currentTarget: HTMLButtonElement}) => {
    event.stopPropagation()
    event.currentTarget.focus()
    if (event.detail === 0 || props.onMove === undefined) {
      props.onSelect?.()
    }
  }
  const handlePointerDown = (event: PointerEvent & {readonly currentTarget: HTMLButtonElement}) => {
    if (isTouchContextRequest(event)) {
      props.onContextMenu?.()
    }
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    const horizontal = x()
    const vertical = y()
    if (
      event.button !== 0 ||
      event.isPrimary === false ||
      props.onMove === undefined ||
      bounds === undefined ||
      horizontal === undefined ||
      vertical === undefined
    ) {
      return
    }
    const from = props.keyform.values
    const {pointerId} = event
    const finish = (commit: boolean) => {
      const next = dragValues()
      removePointerListeners?.()
      setDragValues(null)
      if (commit && next !== null && !parameterValuesEqual(from, next)) {
        props.onMove?.(from, next)
      }
    }
    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }
      moveEvent.preventDefault()
      setDragValues([
        getParameterPointerValue(horizontal, bounds.left, bounds.width, moveEvent.clientX),
        getParameterPointerValue(
          vertical,
          bounds.top,
          bounds.height,
          bounds.top + bounds.bottom - moveEvent.clientY,
        ),
      ])
    }
    const handleUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === pointerId) {
        finish(true)
      }
    }
    const handleCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) {
        finish(false)
      }
    }
    const handleEscape = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault()
        finish(false)
      }
    }
    const handleBlur = () => finish(false)
    event.preventDefault()
    event.currentTarget.focus()
    props.onSelect?.()
    removePointerListeners?.()
    setDragValues(null)
    // 전역 구독은 이 제스처가 끝나거나 소유자가 정리될 때 해제한다.
    // eslint-disable-next-line solid/reactivity
    removePointerListeners = () => {
      globalThis.removeEventListener('pointermove', handleMove)
      globalThis.removeEventListener('pointerup', handleUp)
      globalThis.removeEventListener('pointercancel', handleCancel)
      globalThis.removeEventListener('keydown', handleEscape)
      globalThis.removeEventListener('blur', handleBlur)
      removePointerListeners = undefined
    }
    globalThis.addEventListener('pointermove', handleMove)
    globalThis.addEventListener('pointerup', handleUp)
    globalThis.addEventListener('pointercancel', handleCancel)
    globalThis.addEventListener('keydown', handleEscape)
    globalThis.addEventListener('blur', handleBlur)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (props.onMove === undefined || !isUnmodifiedKeypress(event)) {
      return
    }
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
    const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown'
    const parameter = horizontal ? x() : vertical ? y() : undefined
    if (parameter === undefined) {
      return
    }
    const axis = horizontal ? 0 : 1
    const current = props.keyform.values
    const next = getParameterKeyboardValue(parameter, current[axis] ?? 0, event.key)
    if (next === undefined || next === current[axis]) {
      return
    }
    event.preventDefault()
    props.onSelect?.()
    props.onMove(current, horizontal ? [next, current[1] ?? 0] : [current[0], next])
  }
  onCleanup(() => removePointerListeners?.())
  const label = () => `키폼 선택: ${values().join(', ')}`
  return (
    <EditorDiamondButton
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      aria-label={label()}
      aria-pressed={props.active === true}
      data-tooltip={label()}
      class="parameter-grid-keyform"
      classList={{selected: props.active === true}}
      style={{
        bottom: `${y() === undefined ? 0 : getParameterProgress(y()!, values()[1] ?? 0)}%`,
        left: `${x() === undefined ? 0 : getParameterProgress(x()!, values()[0] ?? 0)}%`,
      }}
      type="button"
      onContextMenu={() => props.onContextMenu?.()}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  )
}
