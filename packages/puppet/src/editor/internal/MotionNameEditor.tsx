import {TextField} from '@kobalte/core/text-field'
import {createSignal, onMount, Show} from 'solid-js'

import {EditorTextInput} from '../../design-system'

export interface MotionNameEditorProps {
  readonly motionId: string
  readonly motionIds: ReadonlyArray<string>
  readonly onCancel: () => void
  readonly onRename: (name: string) => void
}

export const MotionNameEditor = (props: MotionNameEditorProps) => {
  const [draft, setDraft] = createSignal<string>()
  const [error, setError] = createSignal<string>()
  const [input, setInput] = createSignal<HTMLInputElement>()
  const commit = () => {
    const name = (draft() ?? props.motionId).trim()
    if (name.length === 0) {
      setError('이름을 입력하세요.')
      return
    }
    if (name !== props.motionId && props.motionIds.includes(name)) {
      setError('이미 사용 중인 이름입니다.')
      return
    }
    if (name === props.motionId) {
      props.onCancel()
      return
    }
    props.onRename(name)
  }

  onMount(() => {
    input()?.focus()
    input()?.select()
  })

  return (
    <div class="timeline-motion-name-editor">
      <TextField
        value={draft() ?? props.motionId}
        onChange={setDraft}
        validationState={error() ? 'invalid' : 'valid'}
      >
        <EditorTextInput
          ref={setInput}
          aria-label="모션 이름"
          onBlur={commit}
          onInput={() => setError(undefined)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              props.onCancel()
            }
          }}
        />
      </TextField>
      <Show when={error()}>{(message) => <span role="alert">{message()}</span>}</Show>
    </div>
  )
}
