import {For} from 'solid-js'
import {type PoffoTrackingOptions, TRACKING_LIMITS} from '@winter-love/wallpaper/settings/tracking'
import {
  resolveTrackingRange,
  TRACKING_RANGE_FIELDS,
  type TrackingRange,
} from '@winter-love/wallpaper/settings/tracking-range'
import {SNumberInput} from './SNumberInput'
import {SRangePad} from './SRangePad'

interface SPoffoMotionRangeProps {
  readonly target?: 'head' | 'eye'
  readonly value?: PoffoTrackingOptions
  readonly onPreview?: (options: PoffoTrackingOptions | null) => void
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
const EDGES = [
  {key: 'minX', label: '좌우 최소', minimum: true, opposite: 'maxX'},
  {key: 'maxX', label: '좌우 최대', minimum: false, opposite: 'minX'},
  {key: 'minY', label: '상하 최소', minimum: true, opposite: 'maxY'},
  {key: 'maxY', label: '상하 최대', minimum: false, opposite: 'minY'},
] as const
const EYE_STEP = 0.05
export const SPoffoMotionRange = (props: SPoffoMotionRangeProps) => {
  const target = () => props.target ?? 'head'
  const label = () => (target() === 'head' ? '얼굴' : '눈동자')
  const step = () => (target() === 'head' ? 1 : EYE_STEP)
  const fields = () => TRACKING_RANGE_FIELDS[target()]
  const limit = () => TRACKING_LIMITS[fields().maxX].max
  const range = () => resolveTrackingRange(props.value, target())
  const values = (value: TrackingRange): PoffoTrackingOptions => ({
    ...props.value,
    ...Object.fromEntries(EDGES.map((edge) => [fields()[edge.key], value[edge.key]])),
  })
  const handlePreview = (value: TrackingRange | null) =>
    props.onPreview?.(value === null ? null : values(value))
  const handleChange = (value: TrackingRange) => props.onChange?.(values(value))
  return (
    <div class="grid min-w-0 gap-2">
      <span class="text-[13px] font-medium text-stone-700">{label()} 움직임 범위</span>
      <SRangePad
        label={`${label()} 움직임 범위`}
        value={range()}
        limit={limit()}
        step={step()}
        compactHandles={target() === 'eye'}
        onPreview={handlePreview}
        onChange={props.onChange === undefined ? undefined : handleChange}
      />
      <div class="grid grid-cols-2 gap-2">
        <For each={EDGES}>
          {(edge) => (
            <div class="grid min-w-0 gap-1 text-xs text-stone-600 [&>.wallpaper-number]:w-full">
              <span>{edge.label}</span>
              <SNumberInput
                label={`${label()} ${edge.label}`}
                value={range()[edge.key]}
                min={edge.minimum ? -limit() : range()[edge.opposite]}
                max={edge.minimum ? range()[edge.opposite] : limit()}
                step={step()}
                disabled={props.onChange === undefined}
                onChange={(value) => handleChange({...range(), [edge.key]: value})}
              />
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
