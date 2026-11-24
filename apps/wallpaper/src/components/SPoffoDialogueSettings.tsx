import {text as uiText} from '../features/localization'
import {DEFAULT_POFFO_SPEECH, type PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import {type ComponentProps} from 'solid-js'
import {SPoffoConversationSettings} from './SPoffoConversationSettings'
import {SPoffoVoiceSettings} from './SPoffoVoiceSettings'
import {SPoffoLipSyncSettings} from './SPoffoLipSyncSettings'

interface SPoffoDialogueSettingsProps extends Pick<
  ComponentProps<typeof SPoffoLipSyncSettings>,
  'assetId' | 'load' | 'source' | 'widgetId'
> {
  readonly value?: PoffoSpeech
  readonly onChange?: (value: PoffoSpeech) => void | Promise<void>
}
export const SPoffoDialogueSettings = (props: SPoffoDialogueSettingsProps) => {
  const update = (patch: Partial<PoffoSpeech>) =>
    props.onChange?.({...DEFAULT_POFFO_SPEECH, ...props.value, ...patch})
  return (
    <section
      aria-label={uiText('대화·음성 설정')}
      class="grid min-w-0 gap-5 [&>section+section]:border-0 [&>section+section]:border-t
      [&>section+section]:border-solid [&>section+section]:border-stone-200 [&>section+section]:pt-5"
    >
      <SPoffoConversationSettings
        value={props.value?.conversation}
        onChange={
          props.onChange === undefined ? undefined : (conversation) => update({conversation})
        }
      />
      <SPoffoVoiceSettings
        value={props.value?.voice}
        onChange={props.onChange === undefined ? undefined : (voice) => update({voice})}
      />
      <SPoffoLipSyncSettings
        widgetId={props.widgetId}
        source={props.source}
        assetId={props.assetId}
        load={props.load}
        value={props.value?.lipsync}
        onChange={props.onChange === undefined ? undefined : (lipsync) => update({lipsync})}
      />
    </section>
  )
}
