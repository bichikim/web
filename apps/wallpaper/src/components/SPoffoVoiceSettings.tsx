import {interfaceLanguage, localizeMessage, text as uiText} from '../features/localization'

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
  get buffering() {
    return uiText('재생하며 다음 음성 생성 중…')
  },
  get download() {
    return uiText('음성 모델 준비 중…')
  },
  get generating() {
    return uiText('음성 생성 중…')
  },
  idle: '',
  get paused() {
    return uiText('일시정지')
  },
  get playing() {
    return uiText('재생 중…')
  },
}
export const SPoffoVoiceSettings = (props: SPoffoVoiceSettingsProps) => {
  const value = createMemo(() => props.value ?? DEFAULT_POFFO_VOICE)
  const preview = useVoicePreview(() => value())
  const languages = createMemo(() => {
    const names = new Intl.DisplayNames([interfaceLanguage.language()], {type: 'language'})
    return SUPERTONIC_LANGUAGE_OPTIONS.map((option) => ({
      label: option.value === 'na' ? uiText('언어 중립') : (names.of(option.value) ?? option.label),
      value: option.value,
    }))
  })
  const change = (patch: Partial<PoffoVoice>) => props.onChange?.({...value(), ...patch})
  const disabled = () => props.disabled || props.onChange === undefined
  return (
    <section aria-label={uiText('위젯 음성 설정')} class="grid gap-4 text-[13px]">
      <div class="flex items-center justify-between gap-2">
        <h3 class="m-0 font-semibold text-stone-800">{uiText('읽어주기')}</h3>
        <SSwitch
          label={uiText('말풍선 읽어주기')}
          checked={value().enabled}
          disabled={disabled()}
          onChange={(enabled) => change({enabled})}
        />
      </div>
      <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
        <span class="text-stone-600">{uiText('음성')}</span>
        <SSelect
          label={uiText('음성 서비스')}
          value={value().provider}
          disabled={disabled()}
          options={[
            {
              label: uiText('로컬 음성'),
              value: 'local',
            },
            {
              label: uiText('ChatGPT 설정 음성'),
              value: 'chatgpt',
            },
          ]}
          onChange={(provider) => change({provider})}
        />
        <span class="text-stone-600">{uiText('언어')}</span>
        <SSelect
          label={uiText('읽어주기 언어')}
          value={value().language}
          disabled={disabled()}
          options={languages()}
          onChange={(language) => change({language})}
        />
      </div>
      <Show when={value().provider === 'local'}>
        <fieldset aria-label={uiText('로컬 음성 모델')} class="m-0 grid min-w-0 gap-3 border-0 p-0">
          <legend class="sr-only">{uiText('로컬 음성 모델')}</legend>
          <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
            <span class="text-stone-600">{uiText('모델')}</span>
            <SSelect
              label={uiText('음성 모델')}
              value={value().model}
              disabled={disabled()}
              options={[
                {label: 'INT8 · 145 MB', value: 'int8'},
                {label: 'Full · 398 MB', value: 'full'},
              ]}
              onChange={(model) => change({model})}
            />
            <span class="text-stone-600">{uiText('목소리')}</span>
            <SSelect
              label={uiText('목소리')}
              value={value().voice}
              disabled={disabled()}
              options={SUPERTONIC_VOICES.map((item) => ({label: item.label, value: item.id}))}
              onChange={(voice) => change({voice})}
            />
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-stone-600">{uiText('GPU 가속')}</span>
            <SSwitch
              label={uiText('GPU 가속')}
              checked={value().gpu}
              disabled={disabled()}
              onChange={(gpu) => change({gpu})}
            />
          </div>
        </fieldset>
      </Show>
      <fieldset
        aria-label={uiText('읽기 재생 설정')}
        class="m-0 grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-3 border-0 p-0"
      >
        <legend class="sr-only">{uiText('읽기 재생 설정')}</legend>
        <span class="text-stone-600">{uiText('속도')}</span>
        <div class="flex min-w-0 items-center gap-2">
          <SNumberInput
            label={uiText('읽기 속도')}
            value={value().speed}
            min={0.5}
            max={2}
            step={0.05}
            disabled={disabled()}
            onChange={(speed) => change({speed})}
          />
          <span class="text-xs text-stone-500">×</span>
        </div>
        <span class="text-stone-600">{uiText('음량')}</span>
        <div class="flex min-w-0 items-center gap-2">
          <SNumberInput
            label={uiText('읽기 음량')}
            value={value().volume}
            min={0}
            max={100}
            step={5}
            disabled={disabled()}
            onChange={(volume) => change({volume})}
          />
          <span class="text-xs text-stone-500">%</span>
        </div>
      </fieldset>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <span role="status" class="text-xs text-stone-500">
          {STATUS[preview.status()]}
        </span>
        <button
          type="button"
          class="wallpaper-file-button"
          disabled={disabled()}
          onClick={preview.play}
        >
          {preview.status() === 'idle'
            ? preview.error() === null
              ? uiText('미리듣기')
              : uiText('다시 듣기')
            : uiText('중지')}
        </button>
      </div>
      <Show when={preview.error()}>
        {(error) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {localizeMessage(error() ?? '')}
          </p>
        )}
      </Show>
    </section>
  )
}
