import {Show} from 'solid-js'
import {
  SEMANTIC_ID_LIMIT,
  type SemanticActionCategory,
  type SemanticActionRelease,
  type SemanticBinding,
} from '@winter-love/wallpaper/settings/semantics'
import {semanticTargets} from '@winter-love/wallpaper/settings/semantic-targets'
import type {CharacterAction} from '../features/semantics/types'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'

interface SPoffoActionTriggerProps {
  readonly value: SemanticBinding
  readonly label?: string
  readonly actions?: readonly CharacterAction[]
  readonly onChange?: (value: SemanticBinding) => void | Promise<void>
}

export const SPoffoActionTrigger = (props: SPoffoActionTriggerProps) => {
  const caption = () => props.label ?? '연결'
  const update = (patch: Partial<SemanticBinding>) => props.onChange?.({...props.value, ...patch})
  const handleCategory = (category: SemanticActionCategory) => {
    if (category !== 'menu') {
      return update({category, menuActive: undefined})
    }
    const label = semanticTargets(props.value)
      .map(
        (target) =>
          props.actions?.find(
            (item) => item.action.kind === target.kind && item.action.id === target.id,
          )?.label ?? target.id,
      )
      .join(' + ')
    return update({
      category,
      menuActive: undefined,
      menuLabel: props.value.menuLabel ?? label.slice(0, SEMANTIC_ID_LIMIT),
    })
  }
  const handleMenuLabel = (event: Event & {currentTarget: HTMLInputElement}) =>
    update({menuLabel: event.currentTarget.value})
  const handleThreshold = (threshold: number) => update({threshold})
  const handleRelease = (release: SemanticActionRelease) => update({release})
  return (
    <>
      <SSelect
        label={`${caption()} 종류`}
        value={props.value.category ?? 'emotion'}
        options={[
          {label: '감정·내용', value: 'emotion'},
          {label: '일반 행동', value: 'behavior'},
          {label: '우클릭 메뉴', value: 'menu'},
        ]}
        onChange={handleCategory}
        disabled={props.onChange === undefined}
      />
      <Show when={props.value.category === 'menu'}>
        <label class="grid gap-1 text-xs text-stone-600">
          메뉴 이름
          <input
            aria-label={`${caption()} 메뉴 이름`}
            value={props.value.menuLabel ?? ''}
            maxLength={SEMANTIC_ID_LIMIT}
            disabled={props.onChange === undefined}
            onChange={handleMenuLabel}
            class="box-border w-full rounded-md border border-solid border-stone-300
              bg-white px-2 py-1.5 font-inherit text-inherit"
          />
        </label>
      </Show>
      <Show when={(props.value.category ?? 'emotion') === 'emotion'}>
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
      <Show when={props.value.category !== 'menu'}>
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
      </Show>
    </>
  )
}
