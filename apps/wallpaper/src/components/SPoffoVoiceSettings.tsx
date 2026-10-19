import {createMemo, Show} from 'solid-js'
import {SUPERTONIC_VOICES} from '@winter-love/supertonic/model'
import {SUPERTONIC_LANGUAGE_OPTIONS} from '@winter-love/supertonic/language'
import {DEFAULT_POFFO_VOICE, type PoffoVoice} from '@winter-love/wallpaper/settings/voice'
import {useVoicePreview} from '../features/voice/use-voice-preview'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'
import {SSwitch} from './SSwitch'

interface SPoffoVoiceSettingsProps {
  readonly value?: PoffoVoice
  readonly disabled?: boolean
  readonly onChange?: (voice: PoffoVoice) => void | Promise<void>
}
const STATUS = {
  buffering: '재생하며 다음 음성 생성 중…',
  download: '음성 모델 준비 중…',
  generating: '음성 생성 중…',
  idle: '',
  playing: '재생 중…',
}
export const SPoffoVoiceSettings = (props: SPoffoVoiceSettingsProps) => {
  const value = createMemo(() => props.value ?? DEFAULT_POFFO_VOICE)
  const preview = useVoicePreview(() => value())
  const change = (patch: Partial<PoffoVoice>) => props.onChange?.({...value(), ...patch})
  const disabled = () => props.disabled || props.onChange === undefined
  return (
    <section aria-label="위젯 음성 설정" class="grid gap-4 text-[13px]">
      <div class="flex items-center justify-between gap-2">
        <h3 class="m-0 font-semibold text-stone-800">읽어주기</h3>
        <SSwitch
          label="말풍선 읽어주기"
          checked={value().enabled}
          disabled={disabled()}
          onChange={(enabled) => change({enabled})}
        />
      </div>
      <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
        <span class="text-stone-600">음성</span>
        <SSelect
          label="음성 서비스"
          value={value().provider}
          disabled={disabled()}
          options={[
            {label: '로컬 음성', value: 'local'},
            {label: 'ChatGPT 설정 음성', value: 'chatgpt'},
          ]}
          onChange={(provider) => change({provider})}
        />
        <span class="text-stone-600">언어</span>
        <SSelect
          label="읽어주기 언어"
          value={value().language}
          disabled={disabled()}
          options={SUPERTONIC_LANGUAGE_OPTIONS}
          onChange={(language) => change({language})}
        />
      </div>
      <Show when={value().provider === 'local'}>
        <fieldset
          aria-label="로컬 음성 모델"
          class="m-0 grid min-w-0 gap-3 rounded-lg border-0 bg-stone-100/75 p-3"
        >
          <legend class="sr-only">로컬 음성 모델</legend>
          <h4 class="m-0 text-xs font-medium text-stone-600">로컬 모델</h4>
          <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
            <span class="text-stone-600">모델</span>
            <SSelect
              label="음성 모델"
              value={value().model}
              disabled={disabled()}
              options={[
                {label: 'INT8 · 145 MB', value: 'int8'},
                {label: 'Full · 398 MB', value: 'full'},
              ]}
              onChange={(model) => change({model})}
            />
            <span class="text-stone-600">목소리</span>
            <SSelect
              label="목소리"
              value={value().voice}
              disabled={disabled()}
              options={SUPERTONIC_VOICES.map((item) => ({label: item.label, value: item.id}))}
              onChange={(voice) => change({voice})}
            />
          </div>
          <div class="flex items-center justify-between gap-3 border-0 border-t border-solid border-stone-200 pt-3">
            <span class="text-stone-600">GPU 가속</span>
            <SSwitch
              label="GPU 가속"
              checked={value().gpu}
              disabled={disabled()}
              onChange={(gpu) => change({gpu})}
            />
          </div>
        </fieldset>
      </Show>
      <fieldset aria-label="읽기 재생 설정" class="m-0 grid min-w-0 grid-cols-2 gap-3 border-0 p-0">
        <legend class="sr-only">읽기 재생 설정</legend>
        <div class="grid min-w-0 gap-2">
          <span class="text-xs text-stone-600">속도</span>
          <div class="flex min-w-0 items-center gap-2">
            <SNumberInput
              label="읽기 속도"
              value={value().speed}
              min={0.5}
              max={2}
              step={0.05}
              disabled={disabled()}
              onChange={(speed) => change({speed})}
            />
            <span class="text-xs text-stone-500">×</span>
          </div>
        </div>
        <div class="grid min-w-0 gap-2">
          <span class="text-xs text-stone-600">음량</span>
          <div class="flex min-w-0 items-center gap-2">
            <SNumberInput
              label="읽기 음량"
              value={value().volume}
              min={0}
              max={100}
              step={5}
              disabled={disabled()}
              onChange={(volume) => change({volume})}
            />
            <span class="text-xs text-stone-500">%</span>
          </div>
        </div>
      </fieldset>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="wallpaper-file-button"
          disabled={disabled()}
          onClick={preview.play}
        >
          {preview.status() === 'idle'
            ? preview.error() === null
              ? '미리듣기'
              : '다시 듣기'
            : '중지'}
        </button>
        <span role="status" class="text-xs text-stone-500">
          {STATUS[preview.status()]}
        </span>
      </div>
      <Show when={preview.error()}>
        {(error) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {error()}
          </p>
        )}
      </Show>
    </section>
  )
}
