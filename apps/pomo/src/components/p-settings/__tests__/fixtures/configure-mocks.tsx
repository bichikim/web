/* oxlint-disable solid/reactivity -- Preserve the test doubles' eager prop snapshots and event callback identity. */
import {vi} from 'vitest'
import type {PModal, PModalProps} from 'src/components/p-modal/PModal'
import type {PRadioSwitch} from 'src/components/p-radio-switch/PRadioSwitch'
import type {PSelect} from 'src/components/p-select/PSelect'
import type {PSwitch} from 'src/components/p-switch/PSwitch'
import type {useDisplayTheme} from 'src/features/display-theme'
import type {useFullscreen} from 'src/hooks/use-fullscreen'
import type {useScreenWakeLock} from 'src/features/screen-wake-lock'
import type {LEGACY_WEATHER_LOCATIONS} from 'src/features/weather'
import type {PDialogueSettings} from 'src/components/p-dialogue-settings/PDialogueSettings'
import type {PHealthCheck} from 'src/components/p-health-check/PHealthCheck'
import type {PWeatherSettings} from 'src/components/p-weather-settings/PWeatherSettings'

interface ConfigureMocksOptions {
  /** Existing location objects used by the weather mock callbacks. */
  readonly LEGACY_WEATHER_LOCATIONS: typeof LEGACY_WEATHER_LOCATIONS
  /** Registered dialogue settings mock. */
  readonly PDialogueSettings: typeof PDialogueSettings
  /** Registered health check mock. */
  readonly PHealthCheck: typeof PHealthCheck
  /** Registered modal mock. */
  readonly PModal: typeof PModal
  /** Registered radio switch mock. */
  readonly PRadioSwitch: typeof PRadioSwitch
  /** Registered select mock. */
  readonly PSelect: typeof PSelect
  /** Registered switch mock with eager prop snapshots. */
  readonly PSwitch: typeof PSwitch
  /** Registered weather settings mock. */
  readonly PWeatherSettings: typeof PWeatherSettings
  /** Registered display theme controller mock. */
  readonly useDisplayTheme: typeof useDisplayTheme
  /** Registered fullscreen controller mock. */
  readonly useFullscreen: typeof useFullscreen
  /** Registered wake lock controller mock. */
  readonly useScreenWakeLock: typeof useScreenWakeLock
}

export const configureMocks = (options: ConfigureMocksOptions): void => {
  vi.mocked(options.PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
      {props.navigation}
      {props.children}
      <button onClick={() => props.onOpenChange(false)} type="button">
        설정 닫기
      </button>
      <button onClick={props.onCloseAutoFocus} type="button">
        포커스 복원
      </button>
    </div>
  ))
  vi.mocked(options.PRadioSwitch).mockImplementation((props) => (
    <button
      data-scene-style={props.sceneStyle}
      data-value={props.value}
      onClick={() => props.onChange(props.options.at(-1)?.value ?? props.value)}
      type="button"
    >
      {props.label}
    </button>
  ))
  vi.mocked(options.PSelect).mockImplementation((props) => (
    <button
      data-value={props.value}
      onClick={() => {
        if (props.multiple === true) {
          props.onChange(props.value)
        } else {
          props.onChange(props.value)
        }
      }}
      type="button"
    >
      {props.label}
    </button>
  ))
  vi.mocked(options.PSwitch).mockImplementation((props) => {
    const checked =
      Object.getOwnPropertyDescriptor(props, 'checked')?.get?.call(props) ?? props.checked
    const className = props.class
    const disabled = props.disabled
    const description = props.description
    return (
      <button
        aria-disabled={disabled}
        aria-pressed={checked}
        class={className}
        data-description={description}
        onClick={() => props.onChange(!checked)}
        type="button"
      >
        {props.label}
      </button>
    )
  })
  vi.mocked(options.useScreenWakeLock).mockReturnValue({
    availability: () => 'supported',
    errorMessage: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  vi.mocked(options.useFullscreen).mockReturnValue({
    availability: () => 'supported',
    error: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  vi.mocked(options.useDisplayTheme).mockReturnValue({
    onPreferenceChange: vi.fn(),
    preference: () => 'system',
  })
  vi.mocked(options.PDialogueSettings).mockImplementation(() => <div>대화 설정</div>)
  vi.mocked(options.PHealthCheck).mockImplementation(() => <div>헬스 체크 진단</div>)
  vi.mocked(options.PWeatherSettings).mockImplementation((props) => (
    <button
      data-location={props.location?.id}
      data-scene-mode={props.sceneMode}
      onClick={() => {
        props.onLocationChange?.(options.LEGACY_WEATHER_LOCATIONS.seoul)
        props.onSceneModeChange?.('rain')
      }}
      type="button"
    >
      날씨 변경
    </button>
  ))
}
