import {text as uiText} from '../features/localization'
import {Show} from 'solid-js'
import {
  DEFAULT_POFFO_TOUCH,
  type PoffoTouch,
  TOUCH_LIMITS,
} from '@winter-love/wallpaper/settings/touch'
import {SSwitch} from './SSwitch'
import {SNumberInput} from './SNumberInput'

interface SPoffoTouchOptionsProps {
  readonly value?: PoffoTouch
  readonly onChange?: (value: PoffoTouch) => void | Promise<void>
}
const PERCENT = 100
const MILLISECONDS = 1000
const DRAG_REFERENCE = DEFAULT_POFFO_TOUCH.distance * PERCENT

export const SPoffoTouchOptions = (props: SPoffoTouchOptionsProps) => {
  const value = () => props.value ?? DEFAULT_POFFO_TOUCH
  const disabled = () => props.onChange === undefined
  const update = (patch: Partial<PoffoTouch>) => props.onChange?.({...value(), ...patch})
  const handleEnabled = (enabled: boolean) => update({enabled})
  const handleClick = (click: boolean) => update({click})
  const handleDrag = (drag: boolean) => update({drag})
  const handleAmount = (amount: number) => update({amount: amount / PERCENT})
  const handleSensitivity = (sensitivity: number) =>
    update({distance: DRAG_REFERENCE / sensitivity})
  const handleReturn = (seconds: number) => update({returnDuration: seconds * MILLISECONDS})
  return (
    <div class="grid gap-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="m-0 font-medium text-stone-800">{uiText('캐릭터 터치')}</h3>
        <SSwitch
          label={uiText('캐릭터 터치 사용')}
          checked={value().enabled}
          disabled={disabled()}
          onChange={handleEnabled}
        />
      </div>
      <Show when={value().enabled}>
        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2">
            {uiText('클릭')}
            <SSwitch
              label={uiText('클릭')}
              checked={value().click}
              disabled={disabled()}
              onChange={handleClick}
            />
          </label>
          <label class="flex items-center gap-2">
            {uiText('드래그')}
            <SSwitch
              label={uiText('드래그')}
              checked={value().drag}
              disabled={disabled()}
              onChange={handleDrag}
            />
          </label>
        </div>
        <div class="grid grid-cols-3 gap-2 [&_.wallpaper-number]:w-full">
          <label class="grid min-w-0 gap-1.5">
            <span class="flex justify-between gap-1 text-xs text-stone-600">
              {`${uiText('클릭 강도')} `}
              <span>%</span>
            </span>
            <SNumberInput
              label={uiText('터치 클릭 강도')}
              value={value().amount * PERCENT}
              min={0}
              max={50}
              step={1}
              disabled={disabled() || !value().click}
              onChange={handleAmount}
            />
          </label>
          <label class="grid min-w-0 gap-1.5" title={uiText('개별 파라미터의 드래그 감도')}>
            <span class="flex justify-between gap-1 text-xs text-stone-600">
              {`${uiText('드래그 감도')} `}
              <span>%</span>
            </span>
            <SNumberInput
              label={uiText('터치 드래그 감도')}
              value={Math.round(DRAG_REFERENCE / value().distance)}
              min={DRAG_REFERENCE / TOUCH_LIMITS.distance.maximum}
              max={DRAG_REFERENCE / TOUCH_LIMITS.distance.minimum}
              step={10}
              disabled={disabled() || !value().drag}
              onChange={handleSensitivity}
            />
          </label>
          <label class="grid min-w-0 gap-1.5" title={uiText('물리가 없는 파라미터의 복귀 시간')}>
            <span class="flex justify-between gap-1 text-xs text-stone-600">
              {`${uiText('복귀 시간')} `}
              <span>{uiText('초')}</span>
            </span>
            <SNumberInput
              label={uiText('터치 복귀 시간')}
              value={value().returnDuration / MILLISECONDS}
              min={0.1}
              max={5}
              step={0.05}
              disabled={disabled()}
              onChange={handleReturn}
            />
          </label>
        </div>
      </Show>
    </div>
  )
}
