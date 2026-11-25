import {text as uiText} from '../features/localization'
import {For} from 'solid-js'
import {type PoffoTrackingOptions, TRACKING_LIMITS} from '@winter-love/wallpaper/settings/tracking'
import {
  resolveTrackingResponse,
  TRACKING_RESPONSE_FIELDS,
} from '@winter-love/wallpaper/settings/tracking-response'
import {SNumberInput} from './SNumberInput'
import {SSlider} from './SSlider'

interface SPoffoMotionResponseProps {
  readonly target?: 'head' | 'eye'
  readonly value?: PoffoTrackingOptions
  readonly onPreview?: (value: PoffoTrackingOptions | null) => void
  readonly onChange?: (value: PoffoTrackingOptions) => void | Promise<void>
}
const AXES = [
  {
    key: 'x',
    get label() {
      return uiText('좌우')
    },
  },
  {
    key: 'y',
    get label() {
      return uiText('상하')
    },
  },
] as const
export const SPoffoMotionResponse = (props: SPoffoMotionResponseProps) => {
  const target = () => props.target ?? 'head'
  const label = () => (target() === 'head' ? uiText('머리') : uiText('눈동자'))
  const response = () => resolveTrackingResponse(props.value, target())
  return (
    <section
      aria-label={uiText('{value0} 반응 배율', {value0: String(label())})}
      class="grid gap-2 py-2"
    >
      <For each={AXES}>
        {(axis) => {
          const key = () => TRACKING_RESPONSE_FIELDS[target()][axis.key]
          const options = (value: number): PoffoTrackingOptions => ({
            ...props.value,
            [key()]: value,
          })
          const handleChange = (value: number) => props.onChange?.(options(value))
          const handlePreview = (value: number | null) =>
            props.onPreview?.(value === null ? null : options(value))
          return (
            <div class="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 text-[13px]">
              <span>{uiText('{value0} 반응', {value0: axis.label})}</span>
              <SSlider
                label={uiText('{value0} {value1} 반응 배율', {
                  value0: String(label()),
                  value1: String(axis.label),
                })}
                value={response()[axis.key]}
                min={TRACKING_LIMITS[key()].min}
                max={TRACKING_LIMITS[key()].max}
                step={0.1}
                disabled={props.onChange === undefined}
                onPreview={handlePreview}
                onChange={handleChange}
              />
              <span class="flex items-center gap-1 [&>.wallpaper-number]:w-22">
                <SNumberInput
                  label={uiText('{value0} {value1} 반응 배율', {
                    value0: String(label()),
                    value1: String(axis.label),
                  })}
                  value={response()[axis.key]}
                  min={TRACKING_LIMITS[key()].min}
                  max={TRACKING_LIMITS[key()].max}
                  step={0.1}
                  disabled={props.onChange === undefined}
                  onChange={handleChange}
                />
                <span class="text-stone-600">×</span>
              </span>
            </div>
          )
        }}
      </For>
    </section>
  )
}
