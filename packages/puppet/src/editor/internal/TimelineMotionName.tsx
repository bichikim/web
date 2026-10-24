import {clamp} from 'es-toolkit/math'
import {createSignal, createUniqueId, type JSX, onCleanup, Show} from 'solid-js'

import {MotionNameEditor} from './MotionNameEditor'

const DELETE_THRESHOLD = 64
const MAXIMUM_OFFSET = 80
const SWIPE_ACTIVATION_DISTANCE = 4

export interface TimelineMotionNameProps {
  readonly children?: JSX.Element
  readonly motionId: string
  readonly motionIds: ReadonlyArray<string>
  readonly onDelete?: () => void
  readonly onRename?: (name: string) => void
}

export const TimelineMotionName = (props: TimelineMotionNameProps) => {
  const descriptionId = createUniqueId()
  const [dragging, setDragging] = createSignal(false)
  const [editing, setEditing] = createSignal(false)
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
  const startNameEdit = () => {
    if (props.onRename === undefined) {
      return
    }
    setOffset(0)
    setEditing(true)
  }
  const handleClick = (event: MouseEvent) => {
    if (!clickState.ignore) {
      return
    }
    event.preventDefault()
    clickState.ignore = false
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      startNameEdit()
      return
    }
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

  onCleanup(() => removeGestureListeners?.())

  return (
    <div
      class="timeline-motion-name-swipe"
      classList={{armed: offset() >= DELETE_THRESHOLD, dragging: dragging()}}
      style={{'--timeline-motion-name-offset': `${offset()}px`}}
    >
      <div class="timeline-motion-name-delete" aria-hidden="true">
        <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
        <span>{offset() >= DELETE_THRESHOLD ? '놓아 삭제' : '삭제'}</span>
      </div>
      <div class="timeline-motion-name-surface">
        <Show
          when={editing()}
          fallback={
            <button
              aria-describedby={descriptionId}
              aria-keyshortcuts="Enter F2 Delete"
              aria-label={`${props.motionId} 모션 이름`}
              class="timeline-motion-name"
              title="더블클릭하여 모션 이름 수정"
              type="button"
              onClick={handleClick}
              onDblClick={(event) => {
                event.preventDefault()
                startNameEdit()
              }}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
            >
              <strong>{props.motionId}</strong>
              <span
                aria-hidden="true"
                class="puppet-icon puppet-icon-arrow-left timeline-motion-name-hint"
              />
            </button>
          }
        >
          <MotionNameEditor
            motionId={props.motionId}
            motionIds={props.motionIds}
            onCancel={() => setEditing(false)}
            onRename={(name) => {
              props.onRename?.(name)
              setEditing(false)
            }}
          />
        </Show>
        {props.children}
      </div>
      <span id={descriptionId} class="visually-hidden">
        더블클릭하거나 Enter 또는 F2 키로 이름을 수정합니다. 왼쪽으로 밀어 놓으면 삭제합니다.
        키보드에서는 Delete 키를 두 번 누릅니다.
      </span>
    </div>
  )
}
