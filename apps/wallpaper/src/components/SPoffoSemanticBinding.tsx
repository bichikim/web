import {createMemo, Show} from 'solid-js'
import type {
  SemanticAction,
  SemanticActionRelease,
  SemanticBinding,
} from '@winter-love/wallpaper/settings/semantics'
import {semanticTargets} from '@winter-love/wallpaper/settings/semantic-targets'
import {SPoffoActionSelection} from './SPoffoActionSelection'
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
  const handleCategory = (category: 'emotion' | 'behavior') => update({category})
  const handleThreshold = (threshold: number) => update({threshold})
  const handleRelease = (release: SemanticActionRelease) => update({release})
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
        <Show when={props.value.category !== 'behavior' && props.score !== undefined}>
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
      <Show when={props.value.category !== 'behavior'}>
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
      <SSelect
        label={`${caption()} 종류`}
        value={props.value.category ?? 'emotion'}
        options={[
          {label: '감정·내용', value: 'emotion'},
          {label: '일반 행동', value: 'behavior'},
        ]}
        onChange={handleCategory}
        disabled={props.onChange === undefined}
      />
      <Show when={props.value.category !== 'behavior'}>
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
      </Show>
      <label class="grid gap-1 text-xs text-stone-600">
        해제 시점
        <SSelect
          label={`${caption()} 해제 시점`}
          value={props.value.release ?? 'speech-end'}
          options={[
            {label: '음성이 끝나면 해제', value: 'speech-end'},
            {label: '다음 음성까지 유지', value: 'next-speech'},
          ]}
          onChange={handleRelease}
          disabled={props.onChange === undefined}
        />
      </label>
    </div>
  )
}
