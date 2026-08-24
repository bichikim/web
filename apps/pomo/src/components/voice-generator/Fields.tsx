import {cx} from 'class-variance-authority'
import {For, type JSX, Show} from 'solid-js'
import {SUPERTONIC_VOICES, type SupertonicVoiceId} from '../../features/supertonic/index'
import {VOICE_TEST_SCRIPTS} from '../voice-test-scripts'
import {type ImportedVoice, VoiceDropZone} from '../VoiceDropZone'

const MAXIMUM_TEXT_LENGTH = 3000

const VOICE_SELECT_CLASSES = cx(
  'h-13 w-full appearance-none rounded-4 border border-white/10 bg-#17131f',
  'px-4 pr-11 text-sm text-#f8edf1 outline-none transition focus:border-#f2a7b8/70',
)

const TEXTAREA_CLASSES = cx(
  'min-h-36 resize-none rounded-4 border border-white/10 bg-#17131f p-4',
  'text-base leading-7 text-#f8edf1 outline-none transition',
  'placeholder:text-#655b6c focus:border-#f2a7b8/70',
)

interface VoiceFieldsProps {
  readonly disabled: boolean
  readonly fileError: string | null
  readonly importedVoice: ImportedVoice | null
  readonly onFileSelect: (file: File | undefined) => Promise<void>
  readonly onSampleSelect: (text: string) => void
  readonly onTextInput: (event: InputEvent & {currentTarget: HTMLTextAreaElement}) => void
  readonly onVoiceChange: (event: Event & {currentTarget: HTMLSelectElement}) => void
  readonly selectedVoiceId: SupertonicVoiceId
  readonly text: string
}

export const VoiceFields = (props: VoiceFieldsProps) => {
  const selectedScriptId = () =>
    VOICE_TEST_SCRIPTS.find((script) => script.text === props.text)?.id ?? ''
  const handleScriptChange: JSX.EventHandler<HTMLSelectElement, Event> = (event) => {
    const script = VOICE_TEST_SCRIPTS.find((item) => item.id === event.currentTarget.value)

    if (script !== undefined) {
      props.onSampleSelect(script.text)
    }
  }

  return (
    <>
      <label class="grid gap-2.5">
        <span class="flex items-center justify-between text-sm font-650 text-#eee5ef">
          목소리
          <span class="rounded-full bg-white/6 px-2.5 py-1 text-xs font-500 text-#bdb2c4">
            Supertonic 3 · 한국어
          </span>
        </span>
        <div class="relative">
          <select
            class={VOICE_SELECT_CLASSES}
            disabled={props.disabled}
            onChange={(event) => props.onVoiceChange(event)}
            value={props.importedVoice === null ? props.selectedVoiceId : 'custom'}
          >
            <For each={SUPERTONIC_VOICES}>
              {(voice) => (
                <option value={voice.id}>
                  {voice.label} · {voice.gender === 'female' ? '여성' : '남성'}
                  <Show when={voice.recommended}> (추천)</Show>
                </option>
              )}
            </For>
            <Show when={props.importedVoice}>
              {(voice) => <option value="custom">커스텀 · {voice().name}</option>}
            </Show>
          </select>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-#8f8297"
          >
            ▾
          </span>
        </div>
      </label>

      <VoiceDropZone
        disabled={props.disabled}
        fileError={props.fileError}
        importedVoice={props.importedVoice}
        onFileSelect={props.onFileSelect}
      />

      <label class="grid gap-2 text-xs font-650 text-#bdb2c4" for="voice-test-script">
        테스트 대사 빠른 선택
        <div class="relative">
          <select
            class={cx(VOICE_SELECT_CLASSES, 'h-11')}
            disabled={props.disabled}
            id="voice-test-script"
            onChange={handleScriptChange}
            value={selectedScriptId()}
          >
            <option value="">직접 편집</option>
            <For each={VOICE_TEST_SCRIPTS}>
              {(script) => <option value={script.id}>{script.label}</option>}
            </For>
          </select>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-#8f8297"
          >
            ▾
          </span>
        </div>
      </label>

      <label class="grid gap-2.5">
        <span class="flex items-center justify-between text-sm font-650 text-#eee5ef">
          대사
          <span class="text-xs font-500 text-#8f8297">
            {props.text.length} / {MAXIMUM_TEXT_LENGTH}
          </span>
        </span>
        <textarea
          class={TEXTAREA_CLASSES}
          disabled={props.disabled}
          maxlength={MAXIMUM_TEXT_LENGTH}
          onInput={(event) => props.onTextInput(event)}
          placeholder="캐릭터가 말할 문장을 입력하세요"
          value={props.text}
        />
      </label>
    </>
  )
}
