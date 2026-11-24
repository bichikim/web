import {text as uiText} from '../features/localization'
import {DEFAULT_POFFO_SPEECH, type PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import type {ParameterSource} from '../features/tracking/use-parameters'
import {SPoffoSemanticSettings} from './SPoffoSemanticSettings'
import {SPoffoRandomActions} from './SPoffoRandomActions'
import {SPoffoAgentStateSettings} from './SPoffoAgentStateSettings'
import {createSignal, Match, Show, Switch, useContext} from 'solid-js'
import {SSegmentedControl} from './SSegmentedControl'
import {SettingsNavigationContext} from '../features/settings-navigation'
import {HSettingsScope} from './HSettingsScope'
import {SSettingsLinks} from './SSettingsLinks'

interface SPoffoBehaviorSettingsProps {
  readonly source: ParameterSource
  readonly widgetId?: string
  readonly value?: PoffoSpeech
  readonly onChange?: (value: PoffoSpeech) => void | Promise<void>
}

const SECTIONS = [
  {
    get label() {
      return uiText('행동 연결')
    },
    value: 'bindings',
  },
  {
    get label() {
      return uiText('작업 상태 연결')
    },
    value: 'states',
  },
  {
    get label() {
      return uiText('랜덤 행동')
    },
    value: 'random',
  },
]

export const SPoffoBehaviorSettings = (props: SPoffoBehaviorSettingsProps) => {
  const navigation = useContext(SettingsNavigationContext)
  const [section, setSection] = createSignal(navigation === undefined ? 'bindings' : 'overview')
  const handleBack = () => setSection('overview')
  const change = (patch: Partial<PoffoSpeech>) =>
    props.onChange?.({...DEFAULT_POFFO_SPEECH, ...props.value, ...patch})
  return (
    <HSettingsScope
      segment={
        section() === 'overview'
          ? null
          : {
              label: uiText('행동 설정 항목'),
              onBack: handleBack,
              onSelect: setSection,
              options: SECTIONS,
              value: section(),
            }
      }
    >
      <section aria-label={uiText('위젯 행동 설정')} class="grid min-w-0 gap-5">
        <Show
          when={navigation === undefined}
          fallback={
            <Show when={section() === 'overview'}>
              <SSettingsLinks
                label={uiText('행동 설정 목록')}
                options={SECTIONS}
                onChange={setSection}
              />
            </Show>
          }
        >
          <SSegmentedControl
            label={uiText('행동 설정 항목')}
            options={SECTIONS}
            value={section()}
            onChange={setSection}
          />
        </Show>
        <Switch>
          <Match when={section() === 'random'}>
            <SPoffoRandomActions
              value={props.value?.randomActions}
              onChange={
                props.onChange === undefined
                  ? undefined
                  : (randomActions) => change({randomActions})
              }
            />
          </Match>
          <Match when={section() === 'bindings'}>
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
          <Match when={section() === 'states'}>
            <SPoffoAgentStateSettings
              widgetId={props.widgetId}
              actions={props.source.actions?.()}
              parameters={props.source.parameters()}
              loading={props.source.loading()}
              value={props.value?.agentBindings}
              onChange={
                props.onChange === undefined
                  ? undefined
                  : (agentBindings) => change({agentBindings})
              }
            />
          </Match>
        </Switch>
      </section>
    </HSettingsScope>
  )
}
