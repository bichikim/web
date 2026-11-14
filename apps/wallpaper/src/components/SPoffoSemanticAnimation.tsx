import {Show} from 'solid-js'
import type {SemanticAnimation, SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'

interface SPoffoSemanticAnimationProps {
  readonly value: SemanticBinding
  readonly label: string
  readonly onChange?: (value: SemanticBinding) => void | Promise<void>
}
const MODES = [
  {label: '고정', value: 'off'},
  {label: '반복', value: 'repeat'},
  {label: '횟수 지정', value: 'finite'},
]
export const SPoffoSemanticAnimation = (props: SPoffoSemanticAnimationProps) => {
  const mode = () =>
    props.value.animation === undefined
      ? 'off'
      : props.value.animation.cycles === undefined
        ? 'repeat'
        : 'finite'
  const handleMode = (value: string) =>
    props.onChange?.({
      ...props.value,
      animation:
        value === 'off'
          ? undefined
          : {
              ...(props.value.animation ?? {period: 1}),
              cycles: value === 'finite' ? (props.value.animation?.cycles ?? 1) : undefined,
            },
    })
  const update = (patch: Partial<SemanticAnimation>) =>
    props.onChange?.({
      ...props.value,
      animation: {...(props.value.animation ?? {period: 1}), ...patch},
    })
  const handlePeriod = (period: number) => update({period})
  const handlePhase = (phase: number) => update({phase})
  const handleCycles = (cycles: number) => update({cycles})
  return (
    <>
      <SSelect
        label={`${props.label} 움직임`}
        value={mode()}
        options={MODES}
        disabled={props.onChange === undefined}
        onChange={handleMode}
      />
      <Show when={props.value.animation}>
        {(animation) => (
          <div class="grid grid-cols-2 gap-2 text-xs text-stone-600">
            <label class="grid gap-1">
              주기 (초)
              <SNumberInput
                label={`${props.label} 주기`}
                value={animation().period}
                min={0.1}
                max={30}
                step={0.1}
                disabled={props.onChange === undefined}
                onChange={handlePeriod}
              />
            </label>
            <label class="grid gap-1">
              시작 위상
              <SNumberInput
                label={`${props.label} 시작 위상`}
                value={animation().phase ?? 0}
                min={0}
                max={1}
                step={0.05}
                disabled={props.onChange === undefined}
                onChange={handlePhase}
              />
            </label>
            <Show when={animation().cycles !== undefined}>
              <label class="grid gap-1">
                반복 횟수
                <SNumberInput
                  label={`${props.label} 반복 횟수`}
                  value={animation().cycles ?? 1}
                  min={1}
                  max={16}
                  step={1}
                  disabled={props.onChange === undefined}
                  onChange={handleCycles}
                />
              </label>
            </Show>
          </div>
        )}
      </Show>
    </>
  )
}
