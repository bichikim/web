import {text as uiText} from '../features/localization'
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
  const toggleCharacter = (checked: boolean) =>
    props.onChange?.({...value(), showCharacter: checked})
  const toggleCodex = (checked: boolean) => props.onChange?.({...value(), showCodex: checked})
  return (
    <section aria-label={uiText('위젯 말풍선 설정')} class="grid gap-5">
      <div class="flex items-center justify-between gap-2 text-[13px]">
        <h3 class="m-0 font-semibold text-stone-800">{uiText('말풍선 표시')}</h3>
        <SSwitch
          label={uiText('이 위젯에 말풍선 표시')}
          checked={value().enabled}
          onChange={toggle}
          disabled={props.onChange === undefined}
        />
      </div>
      <div class="grid gap-3 text-[13px]">
        <div class="flex items-center justify-between gap-2">
          <span>{uiText('캐릭터와 대화')}</span>
          <SSwitch
            label={uiText('캐릭터와 대화 표시')}
            checked={value().showCharacter !== false}
            onChange={toggleCharacter}
            disabled={!value().enabled || props.onChange === undefined}
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span>{uiText('Codex 말풍선')}</span>
          <SSwitch
            label={uiText('Codex 말풍선 표시')}
            checked={value().showCodex !== false}
            onChange={toggleCodex}
            disabled={!value().enabled || props.onChange === undefined}
          />
        </div>
      </div>
      <div class="grid gap-2 text-[13px]">
        <span class="shrink-0 whitespace-nowrap">{uiText('본문 보기')}</span>
        <SSegmentedControl
          label={uiText('말풍선 본문 보기')}
          value={value().wrap === false ? 'scroll' : 'wrap'}
          options={[
            {
              label: uiText('자동 줄바꿈'),
              value: 'wrap',
            },
            {
              label: uiText('가로 스크롤'),
              value: 'scroll',
            },
          ]}
          disabled={props.onChange === undefined}
          onChange={(mode) => props.onChange?.({...value(), wrap: mode === 'wrap'})}
        />
      </div>
    </section>
  )
}
