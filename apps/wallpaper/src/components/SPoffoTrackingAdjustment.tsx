import {text as uiText} from '../features/localization'
import {createSignal, For, type JSX, Match, Show, Switch, useContext} from 'solid-js'
import {
  type PoffoTracking,
  type PoffoTrackingOptions,
  TRACKING_LIMITS,
} from '@winter-love/wallpaper/settings/tracking'
import {SPoffoTrackingCenter} from './SPoffoTrackingCenter'
import {SPoffoTrackingField, type TrackingAdjustmentField} from './SPoffoTrackingField'
import {SPoffoMotionAdjustment} from './SPoffoMotionAdjustment'
import {SSegmentedControl} from './SSegmentedControl'
import {SPoffoBodyAdjustment} from './SPoffoBodyAdjustment'
import {SettingsNavigationContext} from '../features/settings-navigation'
import {HSettingsScope} from './HSettingsScope'
import {SSettingsLinks} from './SSettingsLinks'

export type CalibrationSection = 'position' | 'head' | 'eye' | 'body' | 'bindings'
const ADJUSTMENT_SECTIONS = [
  {
    get label() {
      return uiText('머리')
    },
    value: 'head',
  },
  {
    get label() {
      return uiText('눈동자')
    },
    value: 'eye',
  },
  {
    get label() {
      return uiText('몸')
    },
    value: 'body',
  },
  {
    get label() {
      return uiText('연결')
    },
    value: 'bindings',
  },
] as const
const POSITION_FIELDS: readonly TrackingAdjustmentField[] = [
  {
    key: 'distance',
    get label() {
      return uiText('사용자 거리')
    },
    ...TRACKING_LIMITS.distance,
    step: 5,
    unit: 'cm',
  },
  {
    key: 'screenDiagonal',
    get label() {
      return uiText('모니터 대각선')
    },
    ...TRACKING_LIMITS.screenDiagonal,
    step: 0.1,
    get unit() {
      return uiText('인치')
    },
  },
  {
    key: 'cameraFov',
    get label() {
      return uiText('카메라 가로 화각')
    },
    ...TRACKING_LIMITS.cameraFov,
    step: 5,
    unit: '°',
  },
]
const TILT_FIELDS: readonly TrackingAdjustmentField[] = [
  {
    key: 'headLimitZ',
    get label() {
      return uiText('머리 기울기 범위')
    },
    ...TRACKING_LIMITS.headLimitZ,
    step: 1,
    unit: '°',
  },
  {
    key: 'headResponseZ',
    get label() {
      return uiText('머리 기울기 반응')
    },
    ...TRACKING_LIMITS.headResponseZ,
    step: 0.1,
    get unit() {
      return uiText('배')
    },
  },
]
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
  const navigation = useContext(SettingsNavigationContext)
  const [overview, setOverview] = createSignal(navigation !== undefined)
  const [local, setLocal] = createSignal<CalibrationSection>('position')
  const section = () => {
    const value = props.section ?? local()
    return value === 'position' && props.mode !== 'camera' ? 'head' : value
  }
  const sections = () =>
    props.mode === 'camera'
      ? [
          {
            get label() {
              return uiText('위치')
            },
            value: 'position' as const,
          },
          ...ADJUSTMENT_SECTIONS,
        ]
      : ADJUSTMENT_SECTIONS
  const handleSection = (value: CalibrationSection) => {
    setOverview(false)
    setLocal(value)
    props.onSectionChange?.(value)
  }
  const handleSelection = (value: string) => {
    const option = sections().find((option) => option.value === value)
    if (option !== undefined) {
      handleSection(option.value)
    }
  }
  const handleBack = () => {
    props.onPreview?.(null)
    setOverview(true)
  }
  const reachKey = () => (section() === 'eye' ? 'eyeCursorReach' : 'cursorReach')
  return (
    <HSettingsScope
      segment={
        overview()
          ? null
          : {
              label: uiText('보정 항목'),
              onBack: handleBack,
              onSelect: handleSelection,
              options: sections(),
              value: section(),
            }
      }
    >
      <div class="grid gap-3">
        <Show
          when={navigation === undefined}
          fallback={
            <Show when={overview()}>
              <SSettingsLinks
                label={uiText('시선 설정 목록')}
                options={sections()}
                onChange={handleSelection}
              />
            </Show>
          }
        >
          <SSegmentedControl
            label={uiText('보정 항목')}
            options={sections()}
            value={section()}
            onChange={handleSection}
          />
        </Show>
        <Show when={!overview()}>
          <Switch>
            <Match when={section() === 'position'}>
              <div class="grid gap-2">
                <p class="m-0 text-xs text-stone-600">
                  {uiText('미리보기에서 카메라와 얼굴 위치를 끌어 맞추세요.')}
                </p>
                <For each={POSITION_FIELDS}>
                  {(field) => (
                    <SPoffoTrackingField
                      field={field}
                      value={props.value}
                      onChange={props.onChange}
                    />
                  )}
                </For>
                <SPoffoTrackingCenter value={props.value} onChange={props.onChange} />
              </div>
            </Match>
            <Match when={section() === 'head'}>
              <SPoffoMotionAdjustment
                target="head"
                value={props.value}
                onPreview={props.onPreview}
                onChange={props.onChange}
              />
              <Show when={props.mode === 'camera-pose'}>
                <For each={TILT_FIELDS}>
                  {(field) => (
                    <SPoffoTrackingField
                      field={field}
                      value={props.value}
                      onChange={props.onChange}
                    />
                  )}
                </For>
              </Show>
            </Match>
            <Match when={section() === 'eye'}>
              <SPoffoMotionAdjustment
                target="eye"
                value={props.value}
                onPreview={props.onPreview}
                onChange={props.onChange}
              />
            </Match>
            <Match when={section() === 'body'}>
              <SPoffoBodyAdjustment value={props.value} onChange={props.onChange} />
            </Match>
            <Match when={section() === 'bindings'}>{props.children}</Match>
          </Switch>
          <Show when={props.mode === 'cursor' && (section() === 'head' || section() === 'eye')}>
            <div title={uiText('캐릭터 높이의 배수')}>
              <SPoffoTrackingField
                field={{
                  key: reachKey(),
                  label: uiText('최대 도달 거리'),
                  ...TRACKING_LIMITS[reachKey()],
                  step: 0.05,
                  unit: uiText('배'),
                }}
                value={props.value}
                onChange={props.onChange}
              />
            </div>
          </Show>
        </Show>
      </div>
    </HSettingsScope>
  )
}
