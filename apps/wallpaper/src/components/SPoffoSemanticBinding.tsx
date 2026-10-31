import {Show} from 'solid-js'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {CharacterAction} from '../features/semantics/types'
import {SPoffoSemanticDescription} from './SPoffoSemanticDescription'
import {SPoffoSemanticPreview} from './SPoffoSemanticPreview'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'
import {SSwitch} from './SSwitch'

interface SPoffoSemanticBindingProps {
  readonly value: SemanticBinding
  readonly score?: number
  readonly label?: string
  readonly actions?: readonly CharacterAction[]
  readonly loading?: boolean
  readonly widgetId?: string
  readonly onChange?: (value: SemanticBinding) => void | Promise<void>
  readonly onRemove?: () => void | Promise<void>
}
export const SPoffoSemanticBinding = (props: SPoffoSemanticBindingProps) => {
  const update = (patch: Partial<SemanticBinding>) => props.onChange?.({...props.value, ...patch})
  const caption = () => props.label ?? '연결'
  const scoreLabel = () => (props.score === -1 ? '제외' : `매칭 ${props.score?.toFixed(2)}`)
  const actionKey = () =>
    props.value.action === undefined ? '' : `${props.value.action.kind}:${props.value.action.id}`
  const available = () =>
    props.actions?.some((item) => `${item.action.kind}:${item.action.id}` === actionKey()) ?? false
  const handleEnabled = (enabled: boolean) => update({enabled})
  const handleAction = (value: string) =>
    update({
      action: props.actions?.find((item) => `${item.action.kind}:${item.action.id}` === value)
        ?.action,
      parameterId: null,
    })
  const handleThreshold = (threshold: number) => update({threshold})
  return (
    <div
      role="group"
      aria-label={caption()}
      class="grid gap-2 rounded-lg border border-solid border-stone-200 p-3"
    >
      <div class="flex items-center gap-2">
        <SSwitch
          label={`${caption()} 사용`}
          checked={props.value.enabled}
          onChange={props.onChange === undefined ? undefined : handleEnabled}
        />
        <Show when={props.score !== undefined}>
          <output aria-label={`${caption()} 매칭 점수`} class="text-xs text-stone-600">
            {scoreLabel()}
          </output>
        </Show>
        <SPoffoSemanticPreview
          widgetId={props.widgetId}
          value={props.value}
          label={caption()}
          available={available()}
          loading={props.loading}
        />
        <button
          type="button"
          aria-label={`${caption()} 삭제`}
          onClick={() => props.onRemove?.()}
          disabled={props.onRemove === undefined}
          class="cursor-pointer border-0 bg-transparent text-xs text-stone-600 disabled:opacity-40"
        >
          삭제
        </button>
      </div>
      <SPoffoSemanticDescription value={props.value} label={caption()} onChange={props.onChange} />
      <SSelect
        label={`${caption()} 행동`}
        value={actionKey()}
        options={[
          {label: '행동 선택', value: ''},
          ...(props.actions ?? []).map((item) => ({
            label: item.label,
            value: `${item.action.kind}:${item.action.id}`,
          })),
        ]}
        disabled={props.loading || props.onChange === undefined}
        onChange={handleAction}
      />
      <label class="grid gap-1 text-xs text-stone-600">
        매칭 기준
        <SNumberInput
          label={`${caption()} 매칭 기준`}
          value={props.value.threshold}
          min={0}
          max={0.99}
          step={0.01}
          disabled={props.onChange === undefined}
          onChange={handleThreshold}
        />
      </label>
    </div>
  )
}
