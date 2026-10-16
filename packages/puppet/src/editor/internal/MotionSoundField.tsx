import {FileField} from '@kobalte/core/file-field'
import {createMemo, createSignal, Show} from 'solid-js'

import {EditorButton} from '../../design-system'
import type {PuppetMotionSound} from '../../player/document'
import {getEmbeddedSoundDuration, readMotionSoundFile} from './motion-sound-file'

export interface MotionSoundFieldProps {
  readonly disabled: boolean
  readonly sound?: PuppetMotionSound
  readonly onChange: (sound: PuppetMotionSound | undefined) => void
}

const SECONDS_DIGITS = 2

/** The motion's sound (Cubism's motion `Sound`): add, replace or remove a WAV file. */
export const MotionSoundField = (props: MotionSoundFieldProps) => {
  const [input, setInput] = createSignal<HTMLInputElement>()
  const [message, setMessage] = createSignal<string>()
  const summary = createMemo(() => {
    const src = props.sound?.src
    if (src === undefined) {
      return '없음'
    }
    const duration = getEmbeddedSoundDuration(src)
    return duration === undefined ? src : `WAV ${duration.toFixed(SECONDS_DIGITS)}초`
  })
  const handleChange = async (event: Event & {currentTarget: HTMLInputElement}) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file === undefined) {
      return
    }
    const result = await readMotionSoundFile(file)
    setMessage(result.ok ? undefined : result.message)
    if (result.ok) {
      props.onChange({src: result.src})
    }
  }
  return (
    <fieldset class="preset-fields">
      <legend>소리</legend>
      <span role="status">{summary()}</span>
      <EditorButton disabled={props.disabled} onClick={() => input()?.click()}>
        {props.sound === undefined ? 'WAV 넣기' : 'WAV 바꾸기'}
      </EditorButton>
      <Show when={props.sound !== undefined}>
        <EditorButton disabled={props.disabled} onClick={() => props.onChange(undefined)}>
          소리 빼기
        </EditorButton>
      </Show>
      <FileField accept=".wav,audio/wav,audio/x-wav">
        <FileField.HiddenInput
          ref={setInput}
          aria-label="모션 소리 WAV 파일"
          hidden
          type="file"
          onChange={(event) => {
            handleChange(event).catch(() => undefined)
          }}
        />
      </FileField>
      <Show when={message()}>{(text) => <span role="alert">{text()}</span>}</Show>
      <small>모션 0초부터 함께 재생되고, 소리가 이어지는 동안 입을 움직입니다.</small>
    </fieldset>
  )
}
