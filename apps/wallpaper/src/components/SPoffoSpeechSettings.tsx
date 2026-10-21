import {SPoffoVoiceSettings} from './SPoffoVoiceSettings'
import {SSegmentedControl} from './SSegmentedControl'
import {SSwitch} from './SSwitch'
import {DEFAULT_POFFO_SPEECH, type PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'

interface SPoffoSpeechSettingsProps {
  readonly value?: PoffoSpeech
  readonly onChange?: (speech: PoffoSpeech) => void | Promise<void>
}
export const SPoffoSpeechSettings = (props: SPoffoSpeechSettingsProps) => {
  const value = () => props.value ?? DEFAULT_POFFO_SPEECH
  const toggle = () => props.onChange?.({...value(), enabled: !value().enabled})
  return (
    <section aria-label="위젯 말풍선 설정" class="grid gap-5">
      <div class="flex items-center justify-between gap-2 text-[13px]">
        <h3 class="m-0 font-semibold text-stone-800">말풍선 표시</h3>
        <SSwitch
          label="이 위젯에 말풍선 표시"
          checked={value().enabled}
          onChange={toggle}
          disabled={props.onChange === undefined}
        />
      </div>
      <div class="grid gap-2 text-[13px]">
        <span class="shrink-0 whitespace-nowrap">본문 보기</span>
        <SSegmentedControl
          label="말풍선 본문 보기"
          value={value().wrap === false ? 'scroll' : 'wrap'}
          options={[
            {label: '자동 줄바꿈', value: 'wrap'},
            {label: '가로 스크롤', value: 'scroll'},
          ]}
          disabled={props.onChange === undefined}
          onChange={(mode) => props.onChange?.({...value(), wrap: mode === 'wrap'})}
        />
      </div>
      <div class="border-0 border-t border-solid border-stone-200 pt-4">
        <SPoffoVoiceSettings
          value={value().voice}
          onChange={
            props.onChange === undefined
              ? undefined
              : (voice) => props.onChange?.({...value(), voice})
          }
        />
      </div>
    </section>
  )
}
