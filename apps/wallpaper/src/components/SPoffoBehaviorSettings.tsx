import {createSignal, Match, Switch} from 'solid-js'
import {DEFAULT_POFFO_SPEECH, type PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import type {ParameterSource} from '../features/tracking/use-parameters'
import {SSegmentedControl} from './SSegmentedControl'
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
  const [section, setSection] = createSignal('semantic')
  const change = (patch: Partial<PoffoSpeech>) =>
    props.onChange?.({...DEFAULT_POFFO_SPEECH, ...props.value, ...patch})
  return (
    <section aria-label="위젯 행동 설정" class="grid min-w-0 gap-3">
      <SSegmentedControl
        label="행동 연결 항목"
        options={[
          {label: '문장 연결', value: 'semantic'},
          {label: '랜덤 행동', value: 'random'},
          {label: '작업 상태', value: 'agent'},
        ]}
        value={section()}
        onChange={setSection}
      />
      <Switch>
        <Match when={section() === 'semantic'}>
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
        </Match>
        <Match when={section() === 'random'}>
          <SPoffoRandomActions
            actions={props.source.actions?.()}
            bindings={props.value?.semanticBindings}
            value={props.value?.randomActions}
            onChange={
              props.onChange === undefined ? undefined : (randomActions) => change({randomActions})
            }
          />
        </Match>
        <Match when={section() === 'agent'}>
          <SPoffoAgentStateSettings
            parameters={props.source.parameters()}
            loading={props.source.loading()}
            value={props.value?.agentBindings}
            onChange={
              props.onChange === undefined ? undefined : (agentBindings) => change({agentBindings})
            }
          />
        </Match>
      </Switch>
    </section>
  )
}
