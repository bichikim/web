import {For} from 'solid-js'
import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
  TRACKING_LIMITS,
} from '@winter-love/wallpaper/settings/tracking'
import {TRACKING_AXES} from '../features/tracking/parameters'
import {SNumberInput} from './SNumberInput'

interface SPoffoMotionCoordinatesProps {
  readonly fields: readonly [keyof PoffoTrackingOptions, keyof PoffoTrackingOptions]
  readonly display?: PoffoTrackingOptions
  readonly value?: PoffoTrackingOptions
  readonly step?: number
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
const axisLabel = (key: keyof PoffoTrackingOptions, index: number) =>
  TRACKING_AXES.find((axis) => axis.center === key)?.label ?? (index === 0 ? '좌우' : '상하')
export const SPoffoMotionCoordinates = (props: SPoffoMotionCoordinatesProps) => {
  return (
    <div class="grid grid-cols-2 gap-2">
      <For each={props.fields}>
        {(key, index) => {
          const handleChange = (value: number) => props.onChange?.({...props.value, [key]: value})
          return (
            <div class="grid min-w-0 gap-1 text-xs text-stone-600 [&>.wallpaper-number]:w-full">
              <span>{index() === 0 ? '좌우' : '상하'}</span>
              <SNumberInput
                label={`${axisLabel(key, index())} 기본 방향`}
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
