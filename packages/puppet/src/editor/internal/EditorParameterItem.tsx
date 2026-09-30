import {createUniqueId, type JSX, onCleanup} from 'solid-js'

import {EditorParameterNames} from './EditorParameterNames'
import {useSwipeDelete} from './use-swipe-delete'

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
  const swipe = useSwipeDelete(() => props.onDelete)
  const handleSelect = () => {
    if (swipe.clickState.ignore) {
      swipe.clickState.ignore = false
      return
    }
    props.onSelect?.()
  }

  return (
    <div
      class="parameter-swipe-row"
      classList={{armed: swipe.armed(), dragging: swipe.dragging()}}
      style={{'--parameter-swipe-offset': `${swipe.offset()}px`}}
    >
      <div class="parameter-swipe-delete" aria-hidden="true">
        <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
        <span>{swipe.armed() ? '놓아 삭제' : '삭제'}</span>
      </div>
      <div class="parameter-item-surface">
        <EditorParameterNames
          descriptionId={descriptionId}
          groupName={props.groupName}
          name={props.name}
          onKeyDown={swipe.handleKeyDown}
          onNameChange={props.onNameChange}
          onNameEdit={() => {
            props.onNameEdit?.()
            swipe.reset()
          }}
          onPointerDown={swipe.handlePointerDown}
          onSecondaryNameChange={props.onSecondaryNameChange}
          onSelect={handleSelect}
          pressed={props.pressed}
          secondaryName={props.secondaryName}
        >
          {props.children}
        </EditorParameterNames>
        <ParameterFooter onPointerDown={swipe.handlePointerDown} clickState={swipe.clickState}>
          {props.footer}
        </ParameterFooter>
      </div>
      <span id={descriptionId} class="visually-hidden">
        오른쪽으로 밀어 놓으면 삭제합니다. 키보드에서는 Delete 키를 두 번 누릅니다.
      </span>
    </div>
  )
}
