import {text as uiText} from '../features/localization'
import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
  TRACKING_LIMITS,
} from '@winter-love/wallpaper/settings/tracking'
import {SPoffoTrackingField} from './SPoffoTrackingField'

interface SPoffoBodyAdjustmentProps {
  /** Current gaze settings; omission displays the body defaults. */
  readonly value?: PoffoTrackingOptions
  /** Persists edited body fields while retaining other gaze settings; omission makes controls read-only. */
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
const PERCENT = 100
export const SPoffoBodyAdjustment = (props: SPoffoBodyAdjustmentProps) => {
  const reset = () =>
    props.onChange?.({
      ...props.value,
      bodyFollowSpeed: DEFAULT_TRACKING_OPTIONS.bodyFollowSpeed,
      bodyScale: DEFAULT_TRACKING_OPTIONS.bodyScale,
    })
  return (
    <div class="grid gap-2">
      <SPoffoTrackingField
        field={{
          key: 'bodyScale',
          label: uiText('몸 회전량'),
          max: TRACKING_LIMITS.bodyScale.max * PERCENT,
          min: TRACKING_LIMITS.bodyScale.min * PERCENT,
          multiplier: PERCENT,
          step: 1,
          unit: '%',
        }}
        value={props.value}
        onChange={props.onChange}
      />
      <SPoffoTrackingField
        field={{
          key: 'bodyFollowSpeed',
          label: uiText('따라오는 속도'),
          ...TRACKING_LIMITS.bodyFollowSpeed,
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
        onClick={reset}
      >
        {uiText('몸 초기화')}
      </button>
    </div>
  )
}
