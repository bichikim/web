import {text as uiText} from '../features/localization'
import type {TouchJoint} from '@winter-love/wallpaper/settings/touch'
import type {TouchParameter} from '../features/touch'
import {SPoffoTouchParameterPicker} from './SPoffoTouchParameterPicker'
import {SNumberInput} from './SNumberInput'

interface SPoffoJointProps {
  readonly value: TouchJoint
  readonly joints: readonly TouchJoint[]
  readonly name: string
  readonly position: number
  readonly parameters: readonly TouchParameter[]
  readonly disabled?: boolean
  readonly onChange?: (joint: TouchJoint) => void | Promise<void>
  readonly onMove?: (direction: number) => void | Promise<void>
  readonly onRemove?: () => void | Promise<void>
}
const PERCENT = 100

export const SPoffoJoint = (props: SPoffoJointProps) => {
  const label = () =>
    uiText('{value0} 관절 {value1}', {
      value0: String(props.name),
      value1: String(props.position + 1),
    })
  const disabled = () => props.disabled || props.onChange === undefined
  const choices = () =>
    props.parameters.filter(
      (parameter) =>
        parameter.joint &&
        (parameter.id === props.value.parameterId ||
          !props.joints.some((joint) => joint.parameterId === parameter.id)),
    )
  const choose = (parameterId: string) => props.onChange?.({...props.value, parameterId})
  const handleResponse = (response: number) =>
    props.onChange?.({...props.value, response: response / PERCENT})
  const handleRemove = () => props.onRemove?.()
  const handleUp = () => props.onMove?.(-1)
  const handleDown = () => props.onMove?.(1)
  const positionTitle = () => {
    if (props.position === 0) {
      return uiText('시작 관절')
    }
    if (props.position === props.joints.length - 1) {
      return uiText('끝 관절')
    }
    return uiText('중간 관절')
  }
  return (
    <div
      class="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)_4.5rem_auto] items-center gap-1.5
      [&_.wallpaper-number]:w-full"
    >
      <span class="text-center text-xs text-stone-600" title={positionTitle()}>
        {props.position + 1}
      </span>
      <SPoffoTouchParameterPicker
        label={uiText('{value0} 파라미터', {value0: String(label())})}
        value={props.value.parameterId}
        placeholder={uiText('파라미터 선택')}
        closeOnSelect
        parameters={choices()}
        disabled={disabled()}
        onSelect={choose}
        emptyMessage={uiText('선택할 회전 관절 파라미터가 없어요.')}
      />
      <SNumberInput
        label={uiText('{value0} 반응', {value0: String(label())})}
        min={0}
        max={100}
        step={5}
        value={props.value.response * PERCENT}
        disabled={disabled()}
        onChange={handleResponse}
      />
      <div class="flex items-center">
        <button
          type="button"
          aria-label={uiText('{value0} 위로', {value0: String(label())})}
          onClick={handleUp}
          disabled={disabled() || props.position === 0 || props.onMove === undefined}
          class="wallpaper-chain-action"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={uiText('{value0} 아래로', {value0: String(label())})}
          onClick={handleDown}
          disabled={
            disabled() || props.position === props.joints.length - 1 || props.onMove === undefined
          }
          class="wallpaper-chain-action"
        >
          ↓
        </button>
        <button
          type="button"
          aria-label={uiText('{value0} 삭제', {value0: String(label())})}
          onClick={handleRemove}
          disabled={disabled() || props.joints.length === 1 || props.onRemove === undefined}
          class="wallpaper-chain-action"
        >
          ×
        </button>
      </div>
    </div>
  )
}
