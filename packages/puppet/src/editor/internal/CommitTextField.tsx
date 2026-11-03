import {TextField} from '@kobalte/core/text-field'
import {createSignal} from 'solid-js'

import {EditorTextInput} from '../../design-system'

/** A text field that commits its draft on blur or Enter. */
export const CommitTextField = (props: {
  readonly disabled: boolean
  readonly label: string
  readonly placeholder?: string
  readonly value: string
  readonly onCommit: (value: string) => void
}) => {
  const [draft, setDraft] = createSignal<string>()
  const commit = () => {
    const value = draft()
    setDraft(undefined)
    if (value !== undefined && value !== props.value) {
      props.onCommit(value)
    }
  }
  return (
    <TextField value={draft() ?? props.value} onChange={setDraft}>
      <EditorTextInput
        aria-label={props.label}
        disabled={props.disabled}
        placeholder={props.placeholder}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.isComposing) {
            return
          }
          if (event.key === 'Enter') {
            commit()
          }
        }}
      />
    </TextField>
  )
}
