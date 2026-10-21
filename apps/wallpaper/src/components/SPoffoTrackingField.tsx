import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {SNumberInput} from './SNumberInput'

export interface TrackingAdjustmentField {
  readonly key: keyof PoffoTrackingOptions
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly unit: string
  readonly multiplier?: number
}
interface SPoffoTrackingFieldProps {
  readonly field: TrackingAdjustmentField
  readonly value?: PoffoTrackingOptions
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
export const SPoffoTrackingField = (props: SPoffoTrackingFieldProps) => {
  const multiplier = () => props.field.multiplier ?? 1
  const value = () =>
    (props.value?.[props.field.key] ?? DEFAULT_TRACKING_OPTIONS[props.field.key]) * multiplier()
  const handleChange = (value: number) =>
    props.onChange?.({...props.value, [props.field.key]: value / multiplier()})
  return (
    <div class="wallpaper-row">
      <span>{props.field.label}</span>
      <span class="flex items-center justify-end gap-2">
        <SNumberInput
          label={props.field.label}
          value={value()}
          min={props.field.min}
          max={props.field.max}
          step={props.field.step}
          disabled={props.onChange === undefined}
          onChange={handleChange}
        />
        <span class="w-7 text-stone-600">{props.field.unit}</span>
      </span>
    </div>
  )
}
