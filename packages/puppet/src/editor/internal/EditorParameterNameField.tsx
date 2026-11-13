import {TextField} from '@kobalte/core/text-field'
import {createSignal, onMount} from 'solid-js'
import {EditorTextInput} from '../../design-system'

interface EditorParameterNameFieldProps {
  readonly name: string
  readonly onCancel: () => void
  readonly onCommit: (name: string) => void
}

export const EditorParameterNameField = (props: EditorParameterNameFieldProps) => {
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
          if (event.isComposing) {
            return
          }
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
