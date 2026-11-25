import {text as uiText} from '../features/localization'
import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
  TRACKING_LIMITS,
} from '@winter-love/wallpaper/settings/tracking'
import {TRACKING_RANGE_FIELDS} from '@winter-love/wallpaper/settings/tracking-range'
import {TRACKING_RESPONSE_FIELDS} from '@winter-love/wallpaper/settings/tracking-response'
import {SPoffoMotionPad} from './SPoffoMotionPad'
import {SPoffoMotionRange} from './SPoffoMotionRange'
import {SPoffoMotionResponse} from './SPoffoMotionResponse'
import {SPoffoTrackingField} from './SPoffoTrackingField'

interface MotionGroup {
  readonly calibration: string
  readonly label: string
  readonly centers: readonly [keyof PoffoTrackingOptions, keyof PoffoTrackingOptions]
  readonly limits: readonly [keyof PoffoTrackingOptions, keyof PoffoTrackingOptions]
  readonly scale: keyof PoffoTrackingOptions
  readonly vertical: keyof PoffoTrackingOptions
  readonly step: number
  readonly speed: 'headFollowSpeed' | 'eyeFollowSpeed'
}
const GROUPS: Readonly<Record<'head' | 'eye', MotionGroup>> = {
  eye: {
    get calibration() {
      return uiText('눈동자 중심 보정')
    },
    centers: ['eyeCenterX', 'eyeCenterY'],
    get label() {
      return uiText('눈동자')
    },
    limits: ['eyeLimitX', 'eyeLimitY'],
    scale: 'eyeScale',
    speed: 'eyeFollowSpeed',
    step: 0.05,
    vertical: 'eyeVerticalScale',
  },
  head: {
    get calibration() {
      return uiText('머리 정면 보정')
    },
    centers: ['headCenterX', 'headCenterY'],
    get label() {
      return uiText('머리')
    },
    limits: ['headLimitX', 'headLimitY'],
    scale: 'headScale',
    speed: 'headFollowSpeed',
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
      current.speed,
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
          label={group().calibration}
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
      <SPoffoTrackingField
        field={{
          key: group().speed,
          label: uiText('따라오는 속도'),
          ...TRACKING_LIMITS[group().speed],
          step: 0.1,
          unit: uiText('배'),
        }}
        value={props.value}
        onChange={props.onChange}
      />
      <button
        type="button"
        class="wallpaper-file-button justify-self-end"
        disabled={props.onChange === undefined}
        title={uiText('보정·범위·반응·속도 초기화')}
        onClick={reset}
      >
        {uiText('{value0} 초기화', {value0: group().label})}
      </button>
    </div>
  )
}
