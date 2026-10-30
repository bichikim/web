import {TextField} from '@kobalte/core/text-field'
import {createSignal, Show} from 'solid-js'

import {EditorTextInput} from '../../design-system'

export interface PresetNameFieldProps {
  readonly disabled?: boolean
  readonly label: string
  readonly value: string
  /** Applies the name; returns false when it is empty or already used. */
  readonly onRename: (name: string) => boolean
}

/** A name input that commits on Enter or blur and reverts on Escape. */
export const PresetNameField = (props: PresetNameFieldProps) => {
  const [draft, setDraft] = createSignal<string>()
  const [error, setError] = createSignal(false)
  const commit = () => {
    const name = draft()
    if (name === undefined || name === props.value) {
      setDraft(undefined)
      return
    }
    if (props.onRename(name)) {
      setDraft(undefined)
      setError(false)
    } else {
      setError(true)
    }
  }
  const cancel = () => {
    setDraft(undefined)
    setError(false)
  }

  return (
    <>
      <TextField
        value={draft() ?? props.value}
        disabled={props.disabled}
        onChange={(value) => {
          setDraft(value)
          setError(false)
        }}
        validationState={error() ? 'invalid' : 'valid'}
      >
        <EditorTextInput
          aria-label={props.label}
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
      <Show when={error()}>
        <span class="entry-name-error" role="alert">
          비어 있거나 이미 사용 중인 이름입니다.
        </span>
      </Show>
    </>
  )
}
