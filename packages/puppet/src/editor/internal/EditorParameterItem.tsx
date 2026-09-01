import {TextField} from '@kobalte/core/text-field'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {clamp} from 'es-toolkit/math'
import {createSignal, createUniqueId, onCleanup, onMount, Show} from 'solid-js'

const DELETE_THRESHOLD = 64
const DOUBLE_CLICK_INTERVAL = 400
const MAXIMUM_OFFSET = 80
const SWIPE_ACTIVATION_DISTANCE = 4

interface ParameterNameEditorProps {
  readonly name: string
  readonly onCancel: () => void
  readonly onCommit: (name: string) => void
}

const ParameterNameEditor = (props: ParameterNameEditorProps) => {
  const [input, setInput] = createSignal<HTMLInputElement | undefined>()
  const [name, setName] = createSignal<string>()
  let finished = false
  const commit = () => {
    if (finished) {
      return
    }

    finished = true
    const nextName = (name() ?? props.name).trim()
    props.onCommit(nextName.length > 0 ? nextName : props.name)
  }
  const cancel = () => {
    finished = true
    props.onCancel()
  }

  onMount(() => {
    input()?.focus()
    input()?.select()
  })

  return (
    <TextField
      class="parameter-item parameter-name-editor"
      value={name() ?? props.name}
      onChange={setName}
    >
      <TextField.Input
        ref={setInput}
        aria-label="Parameter 이름"
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            cancel()
          }
        }}
      />
    </TextField>
  )
}

export interface EditorParameterItemProps {
  readonly maximum: number
  readonly minimum: number
  readonly name: string
  readonly onDelete?: () => void
  readonly onNameChange?: (name: string) => void
  readonly onNameEdit?: () => void
  readonly onSelect?: () => void
  readonly pressed?: boolean
  readonly keyformCount?: number
  readonly value: number
}

export const EditorParameterItem = (props: EditorParameterItemProps) => {
  const descriptionId = createUniqueId()
  const [dragging, setDragging] = createSignal(false)
  const [editing, setEditing] = createSignal(false)
  const [offset, setOffset] = createSignal(0)
  let ignoreNextClick = false
  let lastClickTime = Number.NEGATIVE_INFINITY
  let removeGestureListeners: (() => void) | undefined

  const finishGesture = (deleteWhenArmed: boolean, moved: boolean) => {
    const armed = offset() >= DELETE_THRESHOLD
    ignoreNextClick = moved
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
      window.removeEventListener('pointercancel', handlePointerCancel)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      removeGestureListeners = undefined
    }
    window.addEventListener('pointercancel', handlePointerCancel)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const startNameEdit = () => {
    if (props.onNameChange === undefined) {
      return
    }

    props.onNameEdit?.()
    setOffset(0)
    setEditing(true)
  }

  const handleClick = (event: MouseEvent) => {
    if (ignoreNextClick) {
      event.preventDefault()
      ignoreNextClick = false
      return
    }

    if (event.timeStamp - lastClickTime <= DOUBLE_CLICK_INTERVAL) {
      event.preventDefault()
      lastClickTime = Number.NEGATIVE_INFINITY
      startNameEdit()
      return
    }

    lastClickTime = event.timeStamp
    props.onSelect?.()
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

  onCleanup(() => removeGestureListeners?.())

  return (
    <div
      class="parameter-swipe-row"
      classList={{armed: offset() >= DELETE_THRESHOLD, dragging: dragging()}}
      style={{'--parameter-swipe-offset': `${offset()}px`}}
    >
      <div class="parameter-swipe-delete" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M3 4.5h10M6 2.5h4M5 6.5v5M8 6.5v5M11 6.5v5M4 4.5l.6 9h6.8l.6-9" />
        </svg>
        <span>{offset() >= DELETE_THRESHOLD ? '놓아 삭제' : '삭제'}</span>
      </div>
      <Show
        when={editing()}
        fallback={
          <ToggleButton
            aria-describedby={descriptionId}
            aria-keyshortcuts="Delete"
            aria-label={props.name}
            class="parameter-item"
            pressed={props.pressed}
            title="더블클릭하여 Parameter 이름 수정"
            onClick={handleClick}
            onDblClick={(event: MouseEvent) => {
              event.preventDefault()
              startNameEdit()
            }}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
          >
            <strong>{props.name}</strong>
            <small>
              {props.minimum} · {props.value} · {props.maximum} · {props.keyformCount ?? 0} keyforms
            </small>
            <span class="parameter-swipe-hint" aria-hidden="true">
              ←
            </span>
          </ToggleButton>
        }
      >
        <ParameterNameEditor
          name={props.name}
          onCancel={() => setEditing(false)}
          onCommit={(name) => {
            props.onNameChange?.(name)
            setEditing(false)
          }}
        />
      </Show>
      <span id={descriptionId} class="visually-hidden">
        왼쪽으로 밀어 놓으면 삭제합니다. 키보드에서는 Delete 키를 두 번 누릅니다.
      </span>
    </div>
  )
}
