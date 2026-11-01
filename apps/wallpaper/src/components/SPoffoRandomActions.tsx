import {Show} from 'solid-js'
import type {RandomActionSettings} from '@winter-love/wallpaper/settings/random-actions'
import {SSwitch} from './SSwitch'
import {SNumberInput} from './SNumberInput'

interface SPoffoRandomActionsProps {
  readonly value?: RandomActionSettings
  readonly onChange?: (value: RandomActionSettings) => void | Promise<void>
}
const PERCENT = 100
const DEFAULT_RANDOM: RandomActionSettings = {enabled: false, probability: 0.5}
export const SPoffoRandomActions = (props: SPoffoRandomActionsProps) => {
  const value = () => props.value ?? DEFAULT_RANDOM
  const update = (patch: Partial<RandomActionSettings>) => props.onChange?.({...value(), ...patch})
  const toggle = (enabled: boolean) => update({enabled})
  const probability = (percent: number) => update({probability: percent / PERCENT})
  return (
    <section
      aria-label="감정 미매칭 랜덤 행동"
      class="grid gap-3 border-0 border-t border-solid border-stone-200 pt-3 text-[13px]"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="m-0 font-medium text-stone-700">감정이 없을 때 랜덤 행동</h3>
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
      </Show>
    </section>
  )
}
