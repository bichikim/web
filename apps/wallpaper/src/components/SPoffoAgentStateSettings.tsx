import {For, Show} from 'solid-js'
import {
  AGENT_STATES,
  type AgentState,
  type AgentStateBinding,
  type AgentStateBindings,
} from '@winter-love/wallpaper/settings/agent-state'
import type {TrackingParameter} from '../features/tracking/types'
import {useAgentSignals} from '../features/agent-state/use-agent-signals'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'

interface SPoffoAgentStateSettingsProps {
  readonly parameters?: readonly TrackingParameter[]
  readonly loading?: boolean
  readonly value?: AgentStateBindings
  readonly onChange?: (value: AgentStateBindings) => void | Promise<void>
}
const PARAMETER_PREFIX = 'id:'
export const SPoffoAgentStateSettings = (props: SPoffoAgentStateSettingsProps) => {
  const signals = useAgentSignals()
  const update = (key: AgentState, patch: Partial<AgentStateBinding>) =>
    props.onChange?.({...props.value, [key]: {parameterId: null, ...props.value?.[key], ...patch}})
  return (
    <section
      aria-label="에이전트 상태 연결"
      class="grid gap-3 border-0 border-t border-solid border-stone-200 pt-3 text-[13px]"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="m-0 font-medium text-stone-700">에이전트 상태</h3>
        <span class="text-xs text-stone-600">전체 채팅</span>
      </div>
      <For each={AGENT_STATES}>
        {(state) => {
          const binding = () => props.value?.[state.value]
          const selected = () => binding()?.parameterId
          const parameter = () => props.parameters?.find((item) => item.id === selected())
          const options = () => [
            {label: '연결 안 함', value: 'none'},
            ...(props.parameters ?? []).map((item) => ({
              label: item.name || item.id,
              value: `${PARAMETER_PREFIX}${item.id}`,
            })),
            ...(selected() && parameter() === undefined
              ? [{label: `${selected()} (없음)`, value: `${PARAMETER_PREFIX}${selected()}`}]
              : []),
          ]
          const handleParameter = (value: string) =>
            update(state.value, {
              parameterId: value === 'none' ? null : value.slice(PARAMETER_PREFIX.length),
            })
          const handleOn = (on: number) => update(state.value, {on})
          const handleOff = (off: number) => update(state.value, {off})
          return (
            <div class="grid gap-2">
              <div class="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2">
                <div class="flex flex-wrap items-center gap-1">
                  <span>{state.label}</span>
                  <span
                    aria-label={`${state.label} 상태`}
                    class="rounded px-1 text-[10px] font-medium"
                    classList={{
                      'bg-blue-50 text-blue-800': signals()[state.value] === true,
                      'text-stone-500': !signals()[state.value],
                    }}
                  >
                    {signals()[state.value] ? 'ON' : 'OFF'}
                  </span>
                </div>
                <SSelect
                  label={`${state.label} 상태 파라미터`}
                  value={selected() ? `${PARAMETER_PREFIX}${selected()}` : 'none'}
                  options={options()}
                  disabled={props.loading || props.onChange === undefined}
                  onChange={handleParameter}
                />
              </div>
              <Show when={selected()}>
                <div class="grid grid-cols-2 gap-3 rounded-md bg-stone-100 p-2">
                  <label class="grid min-w-0 gap-1">
                    <span class="text-xs text-stone-600">ON</span>
                    <SNumberInput
                      label={`${state.label} ON 값`}
                      value={binding()?.on ?? parameter()?.maximum ?? 1}
                      min={parameter()?.minimum}
                      max={parameter()?.maximum}
                      step={0.1}
                      disabled={props.onChange === undefined || parameter() === undefined}
                      onChange={handleOn}
                    />
                  </label>
                  <label class="grid min-w-0 gap-1">
                    <span class="text-xs text-stone-600">OFF</span>
                    <SNumberInput
                      label={`${state.label} OFF 값`}
                      value={binding()?.off ?? parameter()?.defaultValue ?? 0}
                      min={parameter()?.minimum}
                      max={parameter()?.maximum}
                      step={0.1}
                      disabled={props.onChange === undefined || parameter() === undefined}
                      onChange={handleOff}
                    />
                  </label>
                </div>
              </Show>
            </div>
          )
        }}
      </For>
    </section>
  )
}
