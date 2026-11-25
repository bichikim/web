import {interfaceLanguage, text as uiText} from '../features/localization'
import {parameterName} from '../features/builtin-assets/parameter-name'
import {createMemo, Show} from 'solid-js'
import type {AgentState, AgentStateBinding} from '@winter-love/wallpaper/settings/agent-state'
import type {SemanticAction} from '@winter-love/wallpaper/settings/semantics'
import type {TrackingParameter} from '../features/tracking/types'
import type {CharacterAction} from '../features/semantics/types'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'
import {SPoffoActionSelection} from './SPoffoActionSelection'
import {SPoffoStatePreview} from './SPoffoStatePreview'

interface SPoffoStateBindingProps {
  readonly label: string
  /** State used by manual playback; omission disables the preview. */
  readonly state?: AgentState
  /** Widget receiving manual playback; omission disables the preview. */
  readonly widgetId?: string
  readonly active?: boolean
  readonly value?: AgentStateBinding
  readonly parameters?: readonly TrackingParameter[]
  readonly actions?: readonly CharacterAction[]
  readonly loading?: boolean
  readonly onChange?: (value: AgentStateBinding) => void | Promise<void>
}
const PARAMETER_PREFIX = 'id:'
export const SPoffoStateBinding = (props: SPoffoStateBindingProps) => {
  const update = (patch: Partial<AgentStateBinding>) =>
    props.onChange?.({parameterId: null, ...props.value, ...patch})
  const binding = () => props.value
  const selected = () => binding()?.parameterId
  const parameter = () => props.parameters?.find((item) => item.id === selected())
  const onValue = createMemo(() => binding()?.on ?? parameter()?.maximum ?? 1)
  const offValue = createMemo(() => binding()?.off ?? parameter()?.defaultValue ?? 0)
  const options = () => [
    {
      get label() {
        return uiText('연결 안 함')
      },
      value: 'none',
    },
    ...(props.parameters ?? []).map((item) => ({
      label: parameterName(item, interfaceLanguage.language()),
      value: `${PARAMETER_PREFIX}${item.id}`,
    })),
    ...(selected() && parameter() === undefined
      ? [
          {
            get label() {
              return uiText('{value0} (없음)', {value0: String(selected())})
            },
            value: `${PARAMETER_PREFIX}${selected()}`,
          },
        ]
      : []),
  ]
  const handleParameter = (value: string) =>
    update({
      actions: undefined,
      parameterId: value === 'none' ? null : value.slice(PARAMETER_PREFIX.length),
    })
  const handleActions = (actions: readonly SemanticAction[]) =>
    update({actions, off: undefined, on: undefined, parameterId: null})
  const handleOn = (on: number) => update({on})
  const handleOff = (off: number) => update({off})
  return (
    <div
      role="group"
      aria-label={uiText('{value0} 상태 연결', {value0: String(props.label)})}
      class="grid min-w-0 gap-2 rounded-lg border border-solid border-stone-200 p-3"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium text-stone-700">{props.label}</span>
        <span
          aria-label={uiText('{value0} 상태', {value0: String(props.label)})}
          class="rounded px-1 text-[10px] font-medium"
          classList={{
            'bg-blue-50 text-blue-800': props.active === true,
            'text-stone-500': !props.active,
          }}
        >
          {props.active ? 'ON' : 'OFF'}
        </span>
        <SPoffoStatePreview
          state={props.state}
          widgetId={props.widgetId}
          label={props.label}
          value={props.value}
          actions={props.actions}
          parameters={props.parameters}
          loading={props.loading}
        />
      </div>
      <div class="grid min-w-0 gap-2">
        <Show when={(props.actions?.length ?? 0) > 0}>
          <SPoffoActionSelection
            label={uiText('{value0} 상태', {value0: String(props.label)})}
            value={binding()?.actions}
            actions={props.actions}
            disabled={props.loading}
            onChange={props.onChange === undefined ? undefined : handleActions}
          />
        </Show>
        <Show when={(binding()?.actions?.length ?? 0) === 0}>
          <SSelect
            label={uiText('{value0} 상태 파라미터', {value0: String(props.label)})}
            value={selected() ? `${PARAMETER_PREFIX}${selected()}` : 'none'}
            options={options()}
            disabled={props.loading || props.onChange === undefined}
            onChange={handleParameter}
          />
        </Show>
      </div>
      <Show when={selected()}>
        <div class="grid grid-cols-2 gap-3 rounded-md bg-stone-100 p-2">
          <label class="grid min-w-0 gap-1">
            <span class="text-xs text-stone-600">ON</span>
            <SNumberInput
              label={uiText('{value0} ON 값', {value0: String(props.label)})}
              value={onValue()}
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
              label={uiText('{value0} OFF 값', {value0: String(props.label)})}
              value={offValue()}
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
}
