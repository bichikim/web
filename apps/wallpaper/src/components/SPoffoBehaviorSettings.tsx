import {DEFAULT_POFFO_SPEECH, type PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import type {ParameterSource} from '../features/tracking/use-parameters'
import {SPoffoSemanticSettings} from './SPoffoSemanticSettings'
import {SPoffoRandomActions} from './SPoffoRandomActions'
import {SPoffoAgentStateSettings} from './SPoffoAgentStateSettings'

interface SPoffoBehaviorSettingsProps {
  readonly source: ParameterSource
  readonly widgetId?: string
  readonly value?: PoffoSpeech
  readonly onChange?: (value: PoffoSpeech) => void | Promise<void>
}

export const SPoffoBehaviorSettings = (props: SPoffoBehaviorSettingsProps) => {
  const change = (patch: Partial<PoffoSpeech>) =>
    props.onChange?.({...DEFAULT_POFFO_SPEECH, ...props.value, ...patch})
  return (
    <section aria-label="위젯 행동 설정" class="grid min-w-0 gap-5">
      <SPoffoRandomActions
        value={props.value?.randomActions}
        onChange={
          props.onChange === undefined ? undefined : (randomActions) => change({randomActions})
        }
      />
      <SPoffoSemanticSettings
        actions={props.source.actions?.()}
        widgetId={props.widgetId}
        loading={props.source.loading()}
        value={props.value?.semanticBindings}
        onChange={
          props.onChange === undefined
            ? undefined
            : (semanticBindings) => change({semanticBindings})
        }
      />
      <details class="min-w-0 border-0 border-t border-solid border-stone-200 pt-1">
        <summary class="wallpaper-disclosure font-medium">작업 상태 연결</summary>
        <div class="pt-2">
          <SPoffoAgentStateSettings
            parameters={props.source.parameters()}
            loading={props.source.loading()}
            value={props.value?.agentBindings}
            onChange={
              props.onChange === undefined ? undefined : (agentBindings) => change({agentBindings})
            }
          />
        </div>
      </details>
    </section>
  )
}
