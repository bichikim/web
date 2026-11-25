import {localizeMessage, text as uiText} from '../features/localization'

import {Show} from 'solid-js'
import {useDictationPreferences} from '../features/dictation/use-dictation-preferences'
import type {TranscriptionModel} from '../features/dictation/types'
import {SSelect} from './SSelect'
import {SSwitch} from './SSwitch'

export const SDictationSettings = () => {
  const preferences = useDictationPreferences()
  const changeModel = (model: TranscriptionModel) => preferences.save({model})
  const changeVad = (vad: boolean) => preferences.save({vad})
  return (
    <section
      aria-label={uiText('음성 입력 설정')}
      aria-busy={preferences.busy()}
      class="grid gap-4 border-0 border-t border-solid border-stone-200 pt-5 text-[13px]"
    >
      <h3 class="m-0 font-semibold text-stone-800">{uiText('음성 입력')}</h3>
      <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
        <span class="text-stone-600">{uiText('모델')}</span>
        <SSelect
          label={uiText('음성 인식 모델')}
          value={preferences.value().model}
          disabled={preferences.busy()}
          options={[{label: 'BuzzASR/korean · Q8 · 1.66GB', value: 'buzzasr-korean-q8'}]}
          onChange={changeModel}
        />
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-stone-600">{uiText('발화 구간 감지 · Silero VAD')}</span>
        <SSwitch
          label="Silero VAD"
          checked={preferences.value().vad}
          disabled={preferences.busy()}
          onChange={changeVad}
        />
      </div>
      <Show when={preferences.error()}>
        {(error) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {localizeMessage(error() ?? '')}
          </p>
        )}
      </Show>
    </section>
  )
}
