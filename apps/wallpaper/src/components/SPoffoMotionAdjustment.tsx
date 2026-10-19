import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {TRACKING_RANGE_FIELDS} from '@winter-love/wallpaper/settings/tracking-range'
import {TRACKING_RESPONSE_FIELDS} from '@winter-love/wallpaper/settings/tracking-response'
import {SPoffoMotionPad} from './SPoffoMotionPad'
import {SPoffoMotionRange} from './SPoffoMotionRange'
import {SPoffoMotionResponse} from './SPoffoMotionResponse'

interface MotionGroup {
  readonly label: string
  readonly centers: readonly [keyof PoffoTrackingOptions, keyof PoffoTrackingOptions]
  readonly limits: readonly [keyof PoffoTrackingOptions, keyof PoffoTrackingOptions]
  readonly scale: keyof PoffoTrackingOptions
  readonly vertical: keyof PoffoTrackingOptions
  readonly step: number
}
const GROUPS: Readonly<Record<'head' | 'eye', MotionGroup>> = {
  eye: {
    centers: ['eyeCenterX', 'eyeCenterY'],
    label: '눈동자',
    limits: ['eyeLimitX', 'eyeLimitY'],
    scale: 'eyeScale',
    step: 0.05,
    vertical: 'eyeVerticalScale',
  },
  head: {
    centers: ['headCenterX', 'headCenterY'],
    label: '얼굴',
    limits: ['headLimitX', 'headLimitY'],
    scale: 'headScale',
    step: 1,
    vertical: 'headVerticalScale',
  },
}
interface SPoffoMotionAdjustmentProps {
  readonly target?: 'head' | 'eye'
  readonly value?: PoffoTrackingOptions
  readonly onPreview?: (options: PoffoTrackingOptions | null) => void
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
export const SPoffoMotionAdjustment = (props: SPoffoMotionAdjustmentProps) => {
  const group = () => GROUPS[props.target ?? 'head']
  const reset = () => {
    const current = group()
    const keys = [
      ...current.centers,
      ...current.limits,
      ...Object.values(TRACKING_RANGE_FIELDS[props.target ?? 'head']),
      ...Object.values(TRACKING_RESPONSE_FIELDS[props.target ?? 'head']),
      current.scale,
      current.vertical,
    ]
    return props.onChange?.({
      ...props.value,
      ...Object.fromEntries(keys.map((key) => [key, DEFAULT_TRACKING_OPTIONS[key]])),
    })
  }
  return (
    <div class="grid gap-2">
      <div class="grid grid-cols-2 items-start gap-3">
        <SPoffoMotionPad
          label={`${group().label} 기본 방향`}
          fields={group().centers}
          step={group().step}
          value={props.value}
          onPreview={props.onPreview}
          onChange={props.onChange}
        />
        <SPoffoMotionRange
          target={props.target}
          value={props.value}
          onPreview={props.onPreview}
          onChange={props.onChange}
        />
      </div>
      <SPoffoMotionResponse
        target={props.target}
        value={props.value}
        onPreview={props.onPreview}
        onChange={props.onChange}
      />
      <button
        type="button"
        class="wallpaper-file-button justify-self-end"
        disabled={props.onChange === undefined}
        title="기본 방향·배율·최대 움직임 초기화"
        onClick={reset}
      >
        {group().label} 초기화
      </button>
    </div>
  )
}
