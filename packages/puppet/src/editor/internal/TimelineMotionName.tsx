import {createSignal, createUniqueId, type JSX, Show} from 'solid-js'

import {MotionNameEditor} from './MotionNameEditor'
import {useSwipeDelete} from './use-swipe-delete'

export interface TimelineMotionNameProps {
  readonly children?: JSX.Element
  readonly motionId: string
  readonly motionIds: ReadonlyArray<string>
  readonly onDelete?: () => void
  readonly onRename?: (name: string) => void
}

export const TimelineMotionName = (props: TimelineMotionNameProps) => {
  const descriptionId = createUniqueId()
  const [editing, setEditing] = createSignal(false)
  const swipe = useSwipeDelete(() => props.onDelete, 'left')
  const startNameEdit = () => {
    if (props.onRename === undefined) {
      return
    }
    swipe.reset()
    setEditing(true)
  }
  const handleClick = (event: MouseEvent) => {
    if (!swipe.clickState.ignore) {
      return
    }
    event.preventDefault()
    swipe.clickState.ignore = false
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return
    }
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      startNameEdit()
      return
    }
    swipe.handleKeyDown(event)
  }

  return (
    <div
      class="timeline-motion-name-swipe"
      classList={{armed: swipe.armed(), dragging: swipe.dragging()}}
      style={{'--timeline-motion-name-offset': `${swipe.offset()}px`}}
    >
      <div class="timeline-motion-name-delete" aria-hidden="true">
        <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
        <span>{swipe.armed() ? '놓아 삭제' : '삭제'}</span>
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
              onPointerDown={swipe.handlePointerDown}
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
