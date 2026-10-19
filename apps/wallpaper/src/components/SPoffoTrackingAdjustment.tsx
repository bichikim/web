import {createSignal, type JSX, Match, Show, Switch} from 'solid-js'
import {
  type PoffoTracking,
  type PoffoTrackingOptions,
  TRACKING_LIMITS,
} from '@winter-love/wallpaper/settings/tracking'
import {useFacePosition} from '../features/tracking/use-face-position'
import {SPoffoTrackingField} from './SPoffoTrackingField'
import {SPoffoMotionAdjustment} from './SPoffoMotionAdjustment'
import {SSegmentedControl} from './SSegmentedControl'

export type CalibrationSection = 'position' | 'head' | 'eye' | 'bindings'
const ADJUSTMENT_SECTIONS = [
  {label: '얼굴', value: 'head'},
  {label: '눈동자', value: 'eye'},
  {label: '연결', value: 'bindings'},
] as const
interface SPoffoTrackingAdjustmentProps {
  readonly mode?: PoffoTracking
  readonly section?: CalibrationSection
  readonly value?: PoffoTrackingOptions
  readonly children?: JSX.Element
  readonly onSectionChange?: (section: CalibrationSection) => void
  readonly onPreview?: (options: PoffoTrackingOptions | null) => void
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
export const SPoffoTrackingAdjustment = (props: SPoffoTrackingAdjustmentProps) => {
  const [local, setLocal] = createSignal<CalibrationSection>('position')
  const section = () => {
    const value = props.section ?? local()
    return value === 'position' && props.mode !== 'camera' ? 'head' : value
  }
  const sections = () =>
    props.mode === 'camera'
      ? [{label: '위치', value: 'position' as const}, ...ADJUSTMENT_SECTIONS]
      : ADJUSTMENT_SECTIONS
  const face = useFacePosition(() => props.mode === 'camera' && section() === 'position')
  const handleSection = (value: CalibrationSection) => {
    setLocal(value)
    props.onSectionChange?.(value)
  }
  const update = (patch: PoffoTrackingOptions) => props.onChange?.({...props.value, ...patch})
  const handleCenter = () => {
    const point = face.point()
    if (point !== null) {
      return update({centerX: point.x, centerY: point.y})
    }
  }
  const handleReset = () => update({centerX: 0, centerY: 0})
  return (
    <div class="grid gap-3">
      <SSegmentedControl
        label="보정 항목"
        options={sections()}
        value={section()}
        onChange={handleSection}
      />
      <Switch>
        <Match when={section() === 'position'}>
          <div class="grid gap-2">
            <p class="m-0 text-xs text-stone-600">
              미리보기에서 카메라와 얼굴 위치를 끌어 맞추세요.
            </p>
            <SPoffoTrackingField
              field={{
                key: 'distance',
                label: '사용자 거리',
                ...TRACKING_LIMITS.distance,
                step: 5,
                unit: 'cm',
              }}
              value={props.value}
              onChange={props.onChange}
            />
            <SPoffoTrackingField
              field={{
                key: 'screenDiagonal',
                label: '모니터 대각선',
                ...TRACKING_LIMITS.screenDiagonal,
                step: 0.1,
                unit: '인치',
              }}
              value={props.value}
              onChange={props.onChange}
            />
            <SPoffoTrackingField
              field={{
                key: 'cameraFov',
                label: '카메라 가로 화각',
                ...TRACKING_LIMITS.cameraFov,
                step: 5,
                unit: '°',
              }}
              value={props.value}
              onChange={props.onChange}
            />
            <div class="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                class="wallpaper-file-button"
                disabled={face.point() === null || props.onChange === undefined}
                title="평소 자세로 앉은 뒤 눌러 주세요."
                onClick={handleCenter}
              >
                현재 자세를 정면으로
              </button>
              <button
                type="button"
                class="wallpaper-file-button"
                disabled={props.onChange === undefined}
                onClick={handleReset}
              >
                사용자 정면 초기화
              </button>
            </div>
            <Show when={face.error()}>
              {(message) => (
                <p role="alert" class="m-0 text-xs text-red-700">
                  {message()}
                </p>
              )}
            </Show>
          </div>
        </Match>
        <Match when={section() === 'head'}>
          <SPoffoMotionAdjustment
            target="head"
            value={props.value}
            onPreview={props.onPreview}
            onChange={props.onChange}
          />
        </Match>
        <Match when={section() === 'eye'}>
          <SPoffoMotionAdjustment
            target="eye"
            value={props.value}
            onPreview={props.onPreview}
            onChange={props.onChange}
          />
        </Match>
        <Match when={section() === 'bindings'}>{props.children}</Match>
      </Switch>
    </div>
  )
}
