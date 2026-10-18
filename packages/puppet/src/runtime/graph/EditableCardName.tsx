import {createEffect, createMemo, createSignal, Show} from 'solid-js'
import {TextField} from '@kobalte/core/text-field'
import {EditorTextInput} from '../../design-system'
interface EditableCardNameProps {
  readonly name: string
  readonly label: string
  readonly onRename: (name: string) => void
}
export const EditableCardName = (props: EditableCardNameProps) => {
  const [draft, setDraft] = createSignal<string | undefined>()
  const editing = createMemo(() => draft() !== undefined)
  let input: HTMLInputElement | undefined
  createEffect(() => {
    if (editing()) {
      input?.focus()
      input?.select()
    }
  })
  const begin = () => setDraft(props.name)
  const save = () => {
    const value = draft()
    setDraft(undefined)
    if (value !== undefined && value.trim()) {
      props.onRename(value.trim())
    }
  }
  const editKey = (event: KeyboardEvent) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(undefined)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      save()
    }
  }
  const nameKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      event.stopPropagation()
      begin()
    }
  }
  return (
    <Show
      when={editing()}
      fallback={
        <strong
          tabindex="0"
          role="button"
          aria-label={`${props.name} 이름 바꾸기`}
          onDblClick={begin}
          on:keydown={nameKey}
        >
          {props.name}
        </strong>
      }
    >
      <TextField class="nodrag nopan min-w-0 flex-1">
        <EditorTextInput
          ref={(element) => {
            input = element
          }}
          aria-label={props.label}
          value={draft() ?? ''}
          onInput={(event) => setDraft(event.currentTarget.value)}
          onBlur={save}
          on:keydown={editKey}
        />
      </TextField>
    </Show>
  )
}
