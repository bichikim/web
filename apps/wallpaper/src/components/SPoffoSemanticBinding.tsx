import {createMemo, Show} from 'solid-js'
import type {SemanticAction, SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {semanticTargets} from '@winter-love/wallpaper/settings/semantic-targets'
import {SPoffoActionSelection} from './SPoffoActionSelection'
import type {CharacterAction} from '../features/semantics/types'
import {SPoffoSemanticDescription} from './SPoffoSemanticDescription'
import {SPoffoSemanticPreview} from './SPoffoSemanticPreview'
import {SPoffoActionTrigger} from './SPoffoActionTrigger'
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
  const matching = () => (props.value.category ?? 'emotion') === 'emotion'
  const scoreLabel = () => (props.score === -1 ? '제외' : `매칭 ${props.score?.toFixed(2)}`)
  const targets = createMemo(() => semanticTargets(props.value))
  const available = () =>
    targets().some((target) =>
      props.actions?.some(
        (item) => item.action.kind === target.kind && item.action.id === target.id,
      ),
    )
  const handleEnabled = (enabled: boolean) => update({enabled})
  const handleActions = (actions: readonly SemanticAction[]) =>
    update({action: undefined, actions, parameterId: null})
  const handleGroup = (event: Event & {currentTarget: HTMLInputElement}) =>
    update({exclusiveGroup: event.currentTarget.value.trim() || undefined})
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
        <Show when={matching() && props.score !== undefined}>
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
      <Show when={matching()}>
        <SPoffoSemanticDescription
          value={props.value}
          label={caption()}
          onChange={props.onChange}
        />
      </Show>
      <SPoffoActionSelection
        label={caption()}
        value={targets()}
        actions={props.actions}
        disabled={props.loading || props.onChange === undefined}
        onChange={props.onChange === undefined ? undefined : handleActions}
      />
      <label class="grid gap-1 text-xs text-stone-600">
        그룹
        <input
          aria-label={`${caption()} 그룹`}
          placeholder="기본 그룹"
          maxLength={128}
          value={props.value.exclusiveGroup ?? ''}
          disabled={props.onChange === undefined}
          onChange={handleGroup}
          class="box-border w-full rounded-md border border-solid border-stone-300 bg-white
          px-2 py-1.5 font-inherit text-inherit"
        />
      </label>
      <SPoffoActionTrigger
        value={props.value}
        label={caption()}
        actions={props.actions}
        onChange={props.onChange}
      />
    </div>
  )
}
