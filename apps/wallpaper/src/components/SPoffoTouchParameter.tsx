import {interfaceLanguage, text as uiText} from '../features/localization'
import {parameterName} from '../features/builtin-assets/parameter-name'
import type {TouchAxis, TouchParameterBinding} from '@winter-love/wallpaper/settings/touch'
import type {TouchParameter} from '../features/touch'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'

interface SPoffoTouchParameterProps {
  readonly parameter: TouchParameter
  readonly value?: TouchParameterBinding
  readonly disabled?: boolean
  readonly onChange?: (binding: TouchParameterBinding) => void | Promise<void>
  readonly onRemove?: () => void | Promise<void>
}
const AXES: readonly {readonly value: TouchAxis; readonly label: string}[] = [
  {
    get label() {
      return uiText('기본 축')
    },
    value: 'auto',
  },
  {
    get label() {
      return uiText('가로')
    },
    value: 'x',
  },
  {
    get label() {
      return uiText('세로')
    },
    value: 'y',
  },
  {
    get label() {
      return uiText('Shift + 세로')
    },
    value: 'z',
  },
]

/** Controls the axis and strength of one explicitly added touch parameter. */
export const SPoffoTouchParameter = (props: SPoffoTouchParameterProps) => {
  const label = () => parameterName(props.parameter, interfaceLanguage.language())
  const disabled = () => props.disabled || props.onChange === undefined
  const update = (patch: Partial<TouchParameterBinding>) =>
    props.onChange?.({...props.value, ...patch})
  const handleAxis = (axis: TouchAxis) => update({axis})
  const handleInvert = () => update({invert: !(props.value?.invert ?? false)})
  const handleGain = (gain: number) => update({gain})
  const handleRemove = () => props.onRemove?.()
  return (
    <div
      class="grid min-w-0 gap-2 border-0 border-b border-solid border-stone-200 pb-3
      last:border-b-0 last:pb-0"
    >
      <div class="flex min-w-0 items-center justify-between gap-2">
        <span class="min-w-0 break-words font-medium">{label()}</span>
        <button
          type="button"
          aria-label={uiText('{value0} 터치 삭제', {value0: String(label())})}
          disabled={props.disabled || props.onRemove === undefined}
          onClick={handleRemove}
          class="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-solid border-stone-300
            bg-white text-stone-600 focus-visible:outline-solid focus-visible:outline-2
            focus-visible:outline-blue-700 disabled:cursor-default disabled:opacity-40"
        >
          ×
        </button>
      </div>
      <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_6rem_auto] items-center gap-2">
        <SSelect
          label={uiText('{value0} 드래그 축', {value0: String(label())})}
          options={AXES}
          value={props.value?.axis ?? 'auto'}
          disabled={disabled()}
          onChange={handleAxis}
        />
        <label
          class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1 text-xs
          text-stone-500 [&_.wallpaper-number]:w-full"
        >
          <span>×</span>
          <SNumberInput
            label={uiText('{value0} 터치 배율', {value0: String(label())})}
            min={0}
            max={5}
            step={0.1}
            value={props.value?.gain ?? 1}
            disabled={disabled()}
            onChange={handleGain}
          />
        </label>
        <button
          type="button"
          role="switch"
          aria-label={uiText('{value0} 방향 반전', {value0: String(label())})}
          aria-checked={props.value?.invert ?? false}
          disabled={disabled()}
          onClick={handleInvert}
          class="h-8 cursor-pointer rounded-md border border-solid border-stone-300 bg-white px-2 text-xs text-stone-600
            aria-checked:border-blue-700 aria-checked:bg-blue-700 aria-checked:text-white hover:brightness-95
            focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-40"
        >
          {uiText('반전')}
        </button>
      </div>
    </div>
  )
}
