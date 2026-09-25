import {TextField} from '@kobalte/core/text-field'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {createSignal, type JSX, onMount, Show} from 'solid-js'

import {EditorTextInput} from '../../design-system'

const DOUBLE_CLICK_INTERVAL = 400

type ParameterNameTarget = 'primary' | 'secondary'

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
    <TextField class="parameter-name-editor" value={name() ?? props.name} onChange={setName}>
      <EditorTextInput
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

export interface EditorParameterNamesProps {
  readonly children?: JSX.Element
  readonly descriptionId: string
  readonly groupName?: string
  readonly name: string
  readonly onKeyDown?: (event: KeyboardEvent) => void
  readonly onNameChange?: (name: string) => void
  readonly onNameEdit?: () => void
  readonly onPointerDown?: (event: PointerEvent) => void
  readonly onSecondaryNameChange?: (name: string) => void
  readonly onSelect?: () => void
  readonly pressed?: boolean
  readonly secondaryName?: string
}

export const EditorParameterNames = (props: EditorParameterNamesProps) => {
  const [editing, setEditing] = createSignal<ParameterNameTarget | null>(null)
  let lastClickTime = Number.NEGATIVE_INFINITY
  let lastClickTarget: ParameterNameTarget | null = null
  const getNameChange = (target: ParameterNameTarget) =>
    target === 'primary' ? props.onNameChange : props.onSecondaryNameChange
  const startNameEdit = (target: ParameterNameTarget) => {
    if (getNameChange(target) === undefined) {
      return
    }
    props.onNameEdit?.()
    setEditing(target)
  }
  const handleClick = (event: MouseEvent, target: ParameterNameTarget) => {
    if (target === lastClickTarget && event.timeStamp - lastClickTime <= DOUBLE_CLICK_INTERVAL) {
      event.preventDefault()
      lastClickTime = Number.NEGATIVE_INFINITY
      lastClickTarget = null
      startNameEdit(target)
      return
    }
    lastClickTime = event.timeStamp
    lastClickTarget = target
    props.onSelect?.()
  }
  const handleKeyDown = (event: KeyboardEvent, target: ParameterNameTarget) => {
    if (event.key === 'F2') {
      event.preventDefault()
      startNameEdit(target)
      return
    }
    props.onKeyDown?.(event)
  }
  const handleNameCommit = (target: ParameterNameTarget, name: string) => {
    getNameChange(target)?.(name)
    setEditing(null)
  }

  return (
    <div class="parameter-item-main">
      <div class="parameter-item" data-selected={props.pressed ? '' : undefined}>
        <Show when={props.groupName}>{(groupName) => <small>{groupName()}</small>}</Show>
        <Show
          when={editing() === 'primary'}
          fallback={
            <ToggleButton
              aria-describedby={props.descriptionId}
              aria-keyshortcuts="F2 Delete"
              aria-label={props.name}
              class="parameter-name-control"
              pressed={props.pressed}
              title="더블클릭하여 Parameter 이름 수정"
              onClick={(event) => handleClick(event, 'primary')}
              onDblClick={(event: MouseEvent) => {
                event.preventDefault()
                startNameEdit('primary')
              }}
              onKeyDown={(event) => handleKeyDown(event, 'primary')}
              onPointerDown={(event) => props.onPointerDown?.(event)}
            >
              <strong>{props.name}</strong>
            </ToggleButton>
          }
        >
          <ParameterNameEditor
            name={props.name}
            onCancel={() => setEditing(null)}
            onCommit={(name) => handleNameCommit('primary', name)}
          />
        </Show>
        <Show when={props.secondaryName}>
          {(secondaryName) => (
            <Show
              when={editing() === 'secondary'}
              fallback={
                <ToggleButton
                  aria-describedby={props.descriptionId}
                  aria-keyshortcuts="F2 Delete"
                  aria-label={secondaryName()}
                  class="parameter-name-control"
                  pressed={props.pressed}
                  title="더블클릭하여 Parameter 이름 수정"
                  onClick={(event) => handleClick(event, 'secondary')}
                  onDblClick={(event: MouseEvent) => {
                    event.preventDefault()
                    startNameEdit('secondary')
                  }}
                  onKeyDown={(event) => handleKeyDown(event, 'secondary')}
                  onPointerDown={(event) => props.onPointerDown?.(event)}
                >
                  <strong>{secondaryName()}</strong>
                </ToggleButton>
              }
            >
              <ParameterNameEditor
                name={secondaryName()}
                onCancel={() => setEditing(null)}
                onCommit={(name) => handleNameCommit('secondary', name)}
              />
            </Show>
          )}
        </Show>
        <span aria-hidden="true" class="puppet-icon puppet-icon-arrow-left parameter-swipe-hint" />
      </div>
      <Show when={editing() === null && props.children !== undefined}>
        <div class="parameter-item-details">{props.children}</div>
      </Show>
    </div>
  )
}
