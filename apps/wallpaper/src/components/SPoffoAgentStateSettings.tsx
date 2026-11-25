import {interfaceLanguage, localizeMessage, text as uiText} from '../features/localization'
import {parameterName} from '../features/builtin-assets/parameter-name'

import {createEffect, createMemo, on, onCleanup} from 'solid-js'
import {
  AGENT_STATES,
  type AgentStateBinding,
  type AgentStateBindings,
} from '@winter-love/wallpaper/settings/agent-state'
import type {TrackingParameter} from '../features/tracking/types'
import {useAgentSignals} from '../features/agent-state/use-agent-signals'
import type {CharacterAction} from '../features/semantics/types'
import {SPoffoStateBinding} from './SPoffoStateBinding'
import {useSemanticRuntime} from '../features/semantics/context'
import {SSettingsEditor} from './SSettingsEditor'
import {actionLabel} from '../features/semantics/action-label'

interface SPoffoAgentStateSettingsProps {
  readonly widgetId?: string
  readonly actions?: readonly CharacterAction[]
  readonly parameters?: readonly TrackingParameter[]
  readonly loading?: boolean
  readonly value?: AgentStateBindings
  readonly onChange?: (value: AgentStateBindings) => void | Promise<void>
}
export const SPoffoAgentStateSettings = (props: SPoffoAgentStateSettingsProps) => {
  const runtime = useSemanticRuntime()
  const options = createMemo(() =>
    AGENT_STATES.map((state) => {
      const binding = props.value?.[state.value]
      const actions = (binding?.actions ?? []).map((target) => actionLabel(target, props.actions))
      const parameter = props.parameters?.find((item) => item.id === binding?.parameterId)
      return {
        description:
          actions.join(' + ') ||
          (parameter === undefined
            ? binding?.parameterId
            : parameterName(parameter, interfaceLanguage.language())) ||
          uiText('연결 안 함'),
        label: localizeMessage(state.label),
        value: state.value,
      }
    }),
  )
  createEffect(
    on(
      () => props.widgetId,
      (id) => {
        onCleanup(() => {
          if (id !== undefined) {
            runtime?.previewAgent?.(id, null)
          }
        })
      },
    ),
  )
  const signals = useAgentSignals(
    () => true,
    () => props.widgetId,
  )
  const stopPreview = () => {
    const id = props.widgetId
    if (id !== undefined) {
      runtime?.previewAgent?.(id, null)
    }
  }
  return (
    <section aria-label={uiText('작업 상태 연결')} class="grid min-w-0 gap-3 text-[13px]">
      <SSettingsEditor
        label={uiText('작업 상태 연결')}
        listLabel={uiText('작업 상태 목록')}
        options={options()}
        onSelect={stopPreview}
      >
        {(id) => {
          const state = AGENT_STATES.find((state) => state.value === id)!
          const handleChange = (value: AgentStateBinding) =>
            props.onChange?.({...props.value, [state.value]: value})
          return (
            <SPoffoStateBinding
              state={state.value}
              widgetId={props.widgetId}
              label={localizeMessage(state.label)}
              active={signals()[state.value]}
              value={props.value?.[state.value]}
              parameters={props.parameters}
              actions={props.actions}
              loading={props.loading}
              onChange={props.onChange === undefined ? undefined : handleChange}
            />
          )
        }}
      </SSettingsEditor>
    </section>
  )
}
