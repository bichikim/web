import {clamp} from 'es-toolkit/math'
import {createSignal, createUniqueId, type JSX, onCleanup} from 'solid-js'

import {EditorParameterNames} from './EditorParameterNames'

const DELETE_THRESHOLD = 64
const MAXIMUM_OFFSET = 80
const SWIPE_ACTIVATION_DISTANCE = 4

export interface EditorParameterItemProps {
  readonly footer?: JSX.Element
  readonly children?: JSX.Element
  readonly groupName?: string
  readonly name: string
  readonly onDelete?: () => void
  readonly onNameChange?: (name: string) => void
  readonly onNameEdit?: () => void
  readonly onSecondaryNameChange?: (name: string) => void
  readonly onSelect?: () => void
  readonly pressed?: boolean
  readonly secondaryName?: string
}

interface ParameterFooterProps {
  readonly children?: JSX.Element
  readonly onPointerDown: (event: PointerEvent) => void
  readonly clickState: {ignore: boolean}
}
const ParameterFooter = (props: ParameterFooterProps) => (
  <div
    onPointerDown={(event) => props.onPointerDown(event)}
    ref={(element) => {
      const capture = (event: MouseEvent) => {
        if (props.clickState.ignore) {
          props.clickState.ignore = false
          event.preventDefault()
          event.stopPropagation()
        }
      }
      element.addEventListener('click', capture, true)
      onCleanup(() => element.removeEventListener('click', capture, true))
    }}
  >
    {props.children}
  </div>
)

export const EditorParameterItem = (props: EditorParameterItemProps) => {
  const descriptionId = createUniqueId()
  const [dragging, setDragging] = createSignal(false)
  const [offset, setOffset] = createSignal(0)
  const clickState = {ignore: false}
  let removeGestureListeners: (() => void) | undefined
  const finishGesture = (deleteWhenArmed: boolean, moved: boolean) => {
    const armed = offset() >= DELETE_THRESHOLD
    clickState.ignore = moved
    removeGestureListeners?.()
    setDragging(false)
    if (deleteWhenArmed && armed) {
      props.onDelete?.()
      return
    }
    setOffset(0)
  }
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || props.onDelete === undefined) {
      return
    }
    const initialPointerX = event.clientX
    const initialOffset = offset()
    let moved = false
    removeGestureListeners?.()
    setDragging(true)
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const pointerDelta = initialPointerX - moveEvent.clientX
      moved ||= Math.abs(pointerDelta) >= SWIPE_ACTIVATION_DISTANCE
      if (moved) {
        moveEvent.preventDefault()
      }
      setOffset(clamp(initialOffset + pointerDelta, 0, MAXIMUM_OFFSET))
    }
    const handlePointerUp = () => finishGesture(true, moved)
    const handlePointerCancel = () => finishGesture(false, moved)
    // The stored callback only removes native gesture listeners during completion or cleanup.
    // eslint-disable-next-line solid/reactivity
    removeGestureListeners = () => {
      globalThis.removeEventListener('pointercancel', handlePointerCancel)
      globalThis.removeEventListener('pointermove', handlePointerMove)
      globalThis.removeEventListener('pointerup', handlePointerUp)
      removeGestureListeners = undefined
    }
    globalThis.addEventListener('pointercancel', handlePointerCancel)
    globalThis.addEventListener('pointermove', handlePointerMove)
    globalThis.addEventListener('pointerup', handlePointerUp)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && offset() > 0) {
      event.preventDefault()
      setOffset(0)
      return
    }

    if (event.key !== 'Delete' || props.onDelete === undefined) {
      return
    }

    event.preventDefault()
    if (offset() >= DELETE_THRESHOLD) {
      props.onDelete()
      return
    }

    setOffset(MAXIMUM_OFFSET)
  }
  const handleSelect = () => {
    if (clickState.ignore) {
      clickState.ignore = false
      return
    }
    props.onSelect?.()
  }

  onCleanup(() => removeGestureListeners?.())

  return (
    <div
      class="parameter-swipe-row"
      classList={{armed: offset() >= DELETE_THRESHOLD, dragging: dragging()}}
      style={{'--parameter-swipe-offset': `${offset()}px`}}
    >
      <div class="parameter-swipe-delete" aria-hidden="true">
        <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
        <span>{offset() >= DELETE_THRESHOLD ? '놓아 삭제' : '삭제'}</span>
      </div>
      <div class="parameter-item-surface">
        <EditorParameterNames
          descriptionId={descriptionId}
          groupName={props.groupName}
          name={props.name}
          onKeyDown={handleKeyDown}
          onNameChange={props.onNameChange}
          onNameEdit={() => {
            props.onNameEdit?.()
            setOffset(0)
          }}
          onPointerDown={handlePointerDown}
          onSecondaryNameChange={props.onSecondaryNameChange}
          onSelect={handleSelect}
          pressed={props.pressed}
          secondaryName={props.secondaryName}
        >
          {props.children}
        </EditorParameterNames>
        <ParameterFooter onPointerDown={handlePointerDown} clickState={clickState}>
          {props.footer}
        </ParameterFooter>
      </div>
      <span id={descriptionId} class="visually-hidden">
        왼쪽으로 밀어 놓으면 삭제합니다. 키보드에서는 Delete 키를 두 번 누릅니다.
      </span>
    </div>
  )
}
