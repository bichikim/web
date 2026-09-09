/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {PHealthCheck} from 'src/components/PHealthCheck'
import {PSelect, type PSelectSingleProps} from 'src/components/PSelect'
import {type DisplayThemePreference, useDisplayTheme} from 'src/features/display-theme'
import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {beforeEach, expect, it, vi} from 'vitest'
import {PGeneralSettings} from '../General'
vi.mock('src/components/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('src/features/display-theme', () => ({useDisplayTheme: vi.fn()}))
vi.mock('src/features/screen-wake-lock', () => ({useScreenWakeLock: vi.fn()}))
vi.mock('src/components/PHealthCheck', () => ({PHealthCheck: vi.fn()}))
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

it('should keep character and weather controls out of the general tab', () => {
  render(() => <PGeneralSettings wakeLock={useScreenWakeLock()} />)
  expect(screen.queryByText('시간')).not.toBeInTheDocument()
  expect(screen.queryByText('창문 날씨 표시')).not.toBeInTheDocument()
})
