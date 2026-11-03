import {createUniqueId, type JSX} from 'solid-js'
import {EditorParameterNames} from './EditorParameterNames'
import {useSwipeDelete} from './use-swipe-delete'
import {EditorParameterItemFooter} from './EditorParameterItemFooter'

export interface EditorParameterItemProps {
  readonly footer?: JSX.Element
  readonly children?: JSX.Element
  readonly groupName?: string
  readonly primaryControl?: JSX.Element
  readonly secondaryControl?: JSX.Element
  readonly status?: JSX.Element
  readonly name: string
  readonly onDelete?: () => void
  readonly onNameChange?: (name: string) => void
  readonly onNameEdit?: () => void
  readonly onSecondaryNameChange?: (name: string) => void
  readonly onSelect?: () => void
  readonly onTertiaryNameChange?: (name: string) => void
  readonly pressed?: boolean
  readonly secondaryName?: string
  readonly tertiaryControl?: JSX.Element
  readonly tertiaryName?: string
}

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
      <div class="parameter-item-surface" onPointerDown={swipe.handlePointerDown}>
        <EditorParameterNames
          descriptionId={descriptionId}
          groupName={props.groupName}
          primaryControl={props.primaryControl}
          secondaryControl={props.secondaryControl}
          status={props.status}
          name={props.name}
          onKeyDown={swipe.handleKeyDown}
          onNameChange={props.onNameChange}
          onNameEdit={() => {
            props.onNameEdit?.()
            swipe.reset()
          }}
          onSecondaryNameChange={props.onSecondaryNameChange}
          onSelect={props.onSelect === undefined ? undefined : handleSelect}
          onTertiaryNameChange={props.onTertiaryNameChange}
          pressed={props.pressed}
          secondaryName={props.secondaryName}
          tertiaryControl={props.tertiaryControl}
          tertiaryName={props.tertiaryName}
        >
          {props.children}
        </EditorParameterNames>
        <EditorParameterItemFooter clickState={swipe.clickState}>
          {props.footer}
        </EditorParameterItemFooter>
      </div>
      <span id={descriptionId} class="visually-hidden">
        오른쪽으로 밀어 놓으면 삭제합니다. 키보드에서는 Delete 키를 두 번 누릅니다.
      </span>
    </div>
  )
}
