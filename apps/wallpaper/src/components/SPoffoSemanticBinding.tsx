import {createMemo, Show} from 'solid-js'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {TrackingParameter} from '../features/tracking/types'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'
import {SSwitch} from './SSwitch'
interface SPoffoSemanticBindingProps {
  readonly value: SemanticBinding
  readonly score?: number
  readonly label?: string
  readonly parameters?: readonly TrackingParameter[]
  readonly loading?: boolean
  readonly onChange?: (value: SemanticBinding) => void | Promise<void>
  readonly onRemove?: () => void | Promise<void>
}
const MODES = [
  {label: '토글', mode: 'toggle', releaseWhenUnmatched: false, value: 'toggle'},
  {label: '연속값', mode: 'range', releaseWhenUnmatched: false, value: 'range'},
  {label: '매칭 중 적용', mode: 'toggle', releaseWhenUnmatched: true, value: 'trigger'},
  {label: '연속값 · 매칭 중', mode: 'range', releaseWhenUnmatched: true, value: 'trigger-range'},
] as const
export const SPoffoSemanticBinding = (props: SPoffoSemanticBindingProps) => {
  const update = (patch: Partial<SemanticBinding>) => props.onChange?.({...props.value, ...patch})
  const binding = () => props.value
  const modeValue = createMemo(() => {
    const value = binding()
    return MODES.find(
      (option) =>
        option.mode === value.mode &&
        option.releaseWhenUnmatched === Boolean(value.releaseWhenUnmatched),
    )?.value
  })
  const hasStartValue = createMemo(() => {
    const value = binding()
    return value.mode === 'range' || !value.releaseWhenUnmatched
  })
  const parameter = () => props.parameters?.find((item) => item.id === binding().parameterId)
  const caption = () => props.label ?? '연결'
  const remove = () => props.onRemove?.()
  const handleText = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) =>
    update({text: event.currentTarget.value})
  const handleEnabled = (enabled: boolean) => update({enabled})
  const handleParameter = (value: string) => {
    const selected = props.parameters?.find((item) => item.id === value)
    return update({
      from: binding().mode === 'range' ? selected?.minimum : selected?.defaultValue,
      parameterId: selected?.id ?? null,
      to: selected?.maximum,
    })
  }
  const handleMode = (value: string) => {
    const selected = MODES.find((option) => option.value === value)
    if (selected === undefined) {
      return
    }
    return update({
      from: selected.mode === 'range' ? parameter()?.minimum : parameter()?.defaultValue,
      mode: selected.mode,
      releaseWhenUnmatched: selected.releaseWhenUnmatched,
      to: parameter()?.maximum,
    })
  }
  const handleThreshold = (threshold: number) => update({threshold})
  const handleFrom = (from: number) => update({from})
  const handleTo = (to: number) => update({to})
  return (
    <div
      role="group"
      aria-label={caption()}
      class="grid gap-2 rounded-lg border border-solid border-stone-200 p-3"
    >
      <div class="flex items-center justify-between gap-2">
        <SSwitch
          label={`${caption()} 사용`}
          checked={binding().enabled}
          onChange={props.onChange === undefined ? undefined : handleEnabled}
        />
        <Show when={props.score !== undefined}>
          <output aria-label={`${caption()} 매칭 점수`} class="text-xs text-stone-600">
            매칭 {props.score?.toFixed(2)}
          </output>
        </Show>
        <button
          type="button"
          aria-label={`${caption()} 삭제`}
          onClick={remove}
          disabled={props.onRemove === undefined}
          class="cursor-pointer border-0 bg-transparent text-xs text-stone-600 disabled:opacity-40"
        >
          삭제
        </button>
      </div>
      <textarea
        aria-label={`${caption()} 감정·행동·내용`}
        placeholder="예: 문제를 해결해서 기쁘고 뿌듯한 내용"
        value={binding().text}
        maxLength={1000}
        rows={2}
        onInput={handleText}
        disabled={props.onChange === undefined}
        class="box-border w-full resize-y rounded-md border border-solid border-stone-300 bg-white
          px-2 py-1.5 font-inherit text-inherit"
      />
      <SSelect
        label={`${caption()} 파라미터`}
        value={binding().parameterId ?? ''}
        options={[
          {label: '파라미터 선택', value: ''},
          ...(props.parameters ?? []).map((item) => ({
            label: item.name || item.id,
            value: item.id,
          })),
        ]}
        disabled={props.loading || props.onChange === undefined}
        onChange={handleParameter}
      />
      <div class="grid grid-cols-2 gap-2">
        <SSelect
          label={`${caption()} 연결 방식`}
          value={modeValue()}
          options={MODES}
          disabled={props.onChange === undefined}
          onChange={handleMode}
        />
        <label class="grid gap-1 text-xs text-stone-600">
          매칭 기준
          <SNumberInput
            label={`${caption()} 매칭 기준`}
            value={binding().threshold}
            min={0}
            max={0.99}
            step={0.01}
            disabled={props.onChange === undefined}
            onChange={handleThreshold}
          />
        </label>
        <label class="grid gap-1 text-xs text-stone-600">
          {binding().mode === 'toggle' ? 'OFF' : '시작값'}
          <Show
            when={hasStartValue()}
            fallback={<span class="flex min-h-8 items-center text-stone-700">기본 동작</span>}
          >
            <SNumberInput
              label={`${caption()} 시작값`}
              value={binding().from ?? parameter()?.defaultValue ?? 0}
              min={parameter()?.minimum}
              max={parameter()?.maximum}
              step={0.1}
              disabled={parameter() === undefined || props.onChange === undefined}
              onChange={handleFrom}
            />
          </Show>
        </label>
        <label class="grid gap-1 text-xs text-stone-600">
          {binding().mode === 'toggle' ? 'ON' : '끝값'}
          <SNumberInput
            label={`${caption()} 끝값`}
            value={binding().to ?? parameter()?.maximum ?? 1}
            min={parameter()?.minimum}
            max={parameter()?.maximum}
            step={0.1}
            disabled={parameter() === undefined || props.onChange === undefined}
            onChange={handleTo}
          />
        </label>
      </div>
    </div>
  )
}
