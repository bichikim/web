/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {type Locale, overwriteSetLocale, setLocale} from '@paraglide/runtime'
import {PHealthCheck} from 'src/components/p-health-check/PHealthCheck'
import {PWeatherSettings} from 'src/components/p-weather-settings/PWeatherSettings'
import {PSelect, type PSelectSingleProps} from 'src/components/p-select/PSelect'
import {type DisplayThemePreference, useDisplayTheme} from 'src/features/display-theme'
import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PGeneralDisplaySettings} from '../Display'
import {PGeneralSettings} from '../General'

const originalSetLocale = setLocale

vi.mock('src/components/p-select/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('src/features/display-theme', () => ({useDisplayTheme: vi.fn()}))
vi.mock('src/features/screen-wake-lock', () => ({useScreenWakeLock: vi.fn()}))
vi.mock('src/components/p-health-check/PHealthCheck', () => ({PHealthCheck: vi.fn()}))
vi.mock('src/components/p-weather-settings/PWeatherSettings', () => ({PWeatherSettings: vi.fn()}))
vi.mock('../Display', () => ({PGeneralDisplaySettings: vi.fn()}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(PSelect).mockImplementation((props) => (
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
  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'supported',
    errorMessage: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  vi.mocked(useDisplayTheme).mockReturnValue({
    onPreferenceChange: vi.fn(),
    preference: () => 'system',
  })
  vi.mocked(PHealthCheck).mockImplementation(() => <div>헬스 체크 진단</div>)
})

afterEach(() => {
  overwriteSetLocale(originalSetLocale)
})

it("should pass the selected language without overriding Paraglide's reload policy", () => {
  const activateLocale = vi.fn()
  overwriteSetLocale(activateLocale)

  render(() => <PGeneralSettings wakeLock={useScreenWakeLock()} />)

  const languageSelect = vi
    .mocked(PSelect)
    .mock.calls.map(([props]) => props)
    .find(
      (props) =>
        props.multiple !== true &&
        props.options.some((option) => option.value === 'ko') &&
        props.options.some((option) => option.value === 'en'),
    ) as PSelectSingleProps<Locale> | undefined

  expect(languageSelect?.value).toBe('ko')
  expect(languageSelect?.options).toEqual([
    {label: '한국어', value: 'ko'},
    {label: 'English', value: 'en'},
  ])
  activateLocale.mockClear()
  languageSelect?.onChange('en')
  expect(activateLocale).toHaveBeenCalledExactlyOnceWith('en')
})

it('should expose and change the saved display theme in general settings', () => {
  const onPreferenceChange = vi.fn()
  vi.mocked(useDisplayTheme).mockReturnValue({
    onPreferenceChange,
    preference: () => 'bright',
  })

  render(() => <PGeneralSettings wakeLock={useScreenWakeLock()} />)

  const themeSelect = vi
    .mocked(PSelect)
    .mock.calls.map(([props]) => props)
    .find((props) => props.label === '테마') as
    | PSelectSingleProps<DisplayThemePreference>
    | undefined

  expect(themeSelect?.value).toBe('bright')
  expect(themeSelect?.options).toEqual([
    {label: '다크 모드', value: 'dark'},
    {label: '라이트 모드', value: 'bright'},
    {label: '시스템 설정', value: 'system'},
  ])
  themeSelect?.onChange('dark')
  expect(onPreferenceChange).toHaveBeenCalledWith('dark')
})

it.each(['VITE_POMO_IS_APPS_IN_TOSS', 'VITE_POMO_IS_DESKTOP'] as const)(
  'should show health checks in the %s app runtime',
  (environmentName) => {
    vi.stubEnv(environmentName, 'true')

    render(() => <PGeneralSettings wakeLock={useScreenWakeLock()} />)

    expect(screen.getByText('헬스 체크 진단')).toBeInTheDocument()
    vi.unstubAllEnvs()
  },
)

it('should show health checks in the web development runtime', () => {
  vi.stubEnv('DEV', true)
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_POMO_IS_DESKTOP', '')

  render(() => <PGeneralSettings wakeLock={useScreenWakeLock()} />)

  expect(screen.getByText('헬스 체크 진단')).toBeInTheDocument()
  vi.unstubAllEnvs()
})

it('should show health checks in the production web runtime', () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_POMO_IS_DESKTOP', '')

  render(() => <PGeneralSettings wakeLock={useScreenWakeLock()} />)

  expect(screen.getByText('헬스 체크 진단')).toBeInTheDocument()
  vi.unstubAllEnvs()
})

it('should expose weather controls and forward their preferences in general settings', () => {
  const onWeatherEnabledChange = vi.fn()
  const onWeatherSceneModeChange = vi.fn()
  const onWeatherLocationChange = vi.fn()
  render(() => (
    <PGeneralSettings
      onWeatherEnabledChange={onWeatherEnabledChange}
      onWeatherLocationChange={onWeatherLocationChange}
      onWeatherSceneModeChange={onWeatherSceneModeChange}
      wakeLock={useScreenWakeLock()}
      weatherEnabled={false}
      weatherSceneMode="rain"
    />
  ))

  expect(screen.getByRole('region', {name: '날씨 연동'})).toBeInTheDocument()
  const weatherProps = vi.mocked(PWeatherSettings).mock.calls[0]?.[0]
  expect(weatherProps?.sceneMode).toBe('rain')
  weatherProps?.onSceneModeChange?.('snow')
  expect(onWeatherSceneModeChange).toHaveBeenCalledWith('snow')
  expect(weatherProps?.onLocationChange).toBe(onWeatherLocationChange)
  const displayProps = vi.mocked(PGeneralDisplaySettings).mock.calls[0]?.[0]
  expect(displayProps?.weatherEnabled).toBe(false)
  displayProps?.onWeatherEnabledChange?.(true)
  expect(onWeatherEnabledChange).toHaveBeenCalledWith(true)
})
