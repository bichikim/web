import {For, Show} from 'solid-js'
import type {RandomActionSettings} from '@winter-love/wallpaper/settings/random-actions'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {CharacterAction} from '../features/semantics/types'
import {SSwitch} from './SSwitch'
import {SNumberInput} from './SNumberInput'

interface SPoffoRandomActionsProps {
  readonly value?: RandomActionSettings
  readonly bindings?: readonly SemanticBinding[]
  readonly actions?: readonly CharacterAction[]
  readonly onChange?: (value: RandomActionSettings) => void | Promise<void>
}
const PERCENT = 100
const DEFAULT_RANDOM: RandomActionSettings = {bindingIds: [], enabled: false, probability: 0.3}
export const SPoffoRandomActions = (props: SPoffoRandomActionsProps) => {
  const value = () => props.value ?? DEFAULT_RANDOM
  const update = (patch: Partial<RandomActionSettings>) => props.onChange?.({...value(), ...patch})
  const toggle = (enabled: boolean) => update({enabled})
  const probability = (percent: number) => update({probability: percent / PERCENT})
  const candidates = () =>
    (props.bindings ?? []).filter(
      (binding) =>
        binding.enabled && binding.category === 'behavior' && binding.action !== undefined,
    )
  return (
    <section
      aria-label="무매칭 음성 랜덤 행동"
      class="grid gap-3 border-0 border-t border-solid border-stone-200 pt-3 text-[13px]"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="m-0 font-medium text-stone-700">매칭 없는 음성의 랜덤 행동</h3>
        <SSwitch
          label="랜덤 행동 사용"
          checked={value().enabled}
          onChange={props.onChange === undefined ? undefined : toggle}
        />
      </div>
      <Show when={value().enabled}>
        <label class="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
          발현 확률
          <SNumberInput
            label="랜덤 행동 확률"
            min={0}
            max={100}
            step={5}
            value={value().probability * PERCENT}
            onChange={probability}
            disabled={props.onChange === undefined}
          />
          %
        </label>
        <fieldset class="m-0 grid min-w-0 grid-cols-2 gap-2 border-0 p-0">
          <legend class="mb-2 text-xs text-stone-600">일반 행동 후보</legend>
          <For each={candidates()}>
            {(binding) => {
              const label = () =>
                props.actions?.find(
                  (item) =>
                    item.action.kind === binding.action?.kind &&
                    item.action.id === binding.action?.id,
                )?.label ?? binding.action?.id
              const select = (event: Event & {currentTarget: HTMLInputElement}) =>
                update({
                  bindingIds: event.currentTarget.checked
                    ? [...new Set([...value().bindingIds, binding.id])]
                    : value().bindingIds.filter((id) => id !== binding.id),
                })
              return (
                <label class="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value().bindingIds.includes(binding.id)}
                    onChange={select}
                    disabled={props.onChange === undefined}
                  />
                  <span>{label()}</span>
                </label>
              )
            }}
          </For>
        </fieldset>
      </Show>
    </section>
  )
}
