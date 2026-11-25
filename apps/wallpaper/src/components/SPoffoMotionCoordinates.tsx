import {text as uiText} from '../features/localization'
import {For} from 'solid-js'
import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
  TRACKING_LIMITS,
} from '@winter-love/wallpaper/settings/tracking'
import {SNumberInput} from './SNumberInput'

interface SPoffoMotionCoordinatesProps {
  /** Calibration name for accessible axis labels; omission uses a generic reference-point label. */
  readonly label?: string
  readonly fields: readonly [keyof PoffoTrackingOptions, keyof PoffoTrackingOptions]
  readonly display?: PoffoTrackingOptions
  readonly value?: PoffoTrackingOptions
  readonly step?: number
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
export const SPoffoMotionCoordinates = (props: SPoffoMotionCoordinatesProps) => {
  return (
    <div class="grid grid-cols-2 gap-2">
      <For each={props.fields}>
        {(key, index) => {
          const handleChange = (value: number) => props.onChange?.({...props.value, [key]: value})
          return (
            <div class="grid min-w-0 gap-1 text-xs text-stone-600 [&>.wallpaper-number]:w-full">
              <span>{index() === 0 ? uiText('좌우') : uiText('상하')}</span>
              <SNumberInput
                label={`${props.label ?? uiText('기준점 보정')} ${index() === 0 ? uiText('좌우') : uiText('상하')}`}
                value={props.display?.[key] ?? props.value?.[key] ?? DEFAULT_TRACKING_OPTIONS[key]}
                min={TRACKING_LIMITS[key].min}
                max={TRACKING_LIMITS[key].max}
                step={props.step ?? 1}
                disabled={props.onChange === undefined}
                onChange={handleChange}
              />
            </div>
          )
        }}
      </For>
    </div>
  )
}
