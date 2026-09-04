/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/PModal'
import {PRadioSwitch} from 'src/components/PRadioSwitch'
import {PSelect, type PSelectSingleProps} from 'src/components/PSelect'
import {PSwitch, type PSwitchProps} from 'src/components/PSwitch'
import {type DisplayThemePreference, useDisplayTheme} from 'src/features/display-theme'
import {useFullscreen} from 'src/features/fullscreen'
import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {LEGACY_WEATHER_LOCATIONS} from 'src/features/weather'
import {PDialogueSettings} from '../PDialogueSettings'
import {PHealthCheck} from '../PHealthCheck'
import {PWeatherSettings} from '../PWeatherSettings'
import {PSettings} from '../PSettings'

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('src/components/PModal', () => ({PModal: vi.fn()}))
vi.mock('src/components/PRadioSwitch', () => ({PRadioSwitch: vi.fn()}))
vi.mock('src/components/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('src/components/PSwitch', () => ({PSwitch: vi.fn()}))
vi.mock('src/features/fullscreen', () => ({useFullscreen: vi.fn()}))
vi.mock('src/features/display-theme', () => ({useDisplayTheme: vi.fn()}))
vi.mock('src/features/screen-wake-lock', () => ({useScreenWakeLock: vi.fn()}))
vi.mock('../PCreditsSettings', () => ({PCreditsSettings: vi.fn()}))
vi.mock('../PDialogueSettings', () => ({PDialogueSettings: vi.fn()}))
vi.mock('../PFeedSettings', () => ({PFeedSettings: vi.fn()}))
vi.mock('../PHealthCheck', () => ({PHealthCheck: vi.fn()}))
vi.mock('../PWeatherSettings', () => ({PWeatherSettings: vi.fn()}))
vi.mock('../UserSettings', () => ({UserSettings: vi.fn()}))

interface TabsRootProps {
  readonly children?: JSX.Element
  readonly class?: string
  readonly value?: string
}

let tabsRootProps: TabsRootProps | undefined

beforeEach(() => {
  vi.clearAllMocks()
  tabsRootProps = undefined
  Object.assign(Tabs, {
    Content: (props: {children: JSX.Element}) => <>{props.children}</>,
    List: (props: {children: JSX.Element}) => <>{props.children}</>,
    Trigger: (props: {children: JSX.Element}) => (
      <button role="tab" type="button">
        {props.children}
      </button>
    ),
  })
  vi.mocked(Tabs).mockImplementation((props: TabsRootProps) => {
    tabsRootProps = props
    return <>{props.children}</>
  })
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
      {props.navigation}
      {props.children}
      <button onClick={props.onCloseAutoFocus} type="button">
        포커스 복원
      </button>
    </div>
  ))
  vi.mocked(PRadioSwitch).mockImplementation((props) => (
    <button
      data-scene-style={props.sceneStyle}
      data-value={props.value}
      onClick={() => props.onChange(props.options.at(-1)?.value ?? props.value)}
      type="button"
    >
      {props.label}
    </button>
  ))
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
  vi.mocked(PSwitch).mockImplementation((props) => {
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
  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'supported',
    errorMessage: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  vi.mocked(useFullscreen).mockReturnValue({
    availability: () => 'supported',
    error: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  vi.mocked(useDisplayTheme).mockReturnValue({
    onPreferenceChange: vi.fn(),
    preference: () => 'system',
  })
  vi.mocked(PDialogueSettings).mockImplementation((props) => (
    <button onClick={props.onRequestClose} type="button">
      대화 닫기
    </button>
  ))
  vi.mocked(PHealthCheck).mockImplementation(() => <div>헬스 체크 진단</div>)
  vi.mocked(PWeatherSettings).mockImplementation((props) => (
    <button
      data-location={props.location?.id}
      data-scene-mode={props.sceneMode}
      onClick={() => {
        props.onEnabledChange?.(!props.enabled)
        props.onLocationChange?.(LEGACY_WEATHER_LOCATIONS.seoul)
        props.onSceneModeChange?.('rain')
      }}
      type="button"
    >
      날씨 변경
    </button>
  ))
})

it('should expose and change the saved display theme in general settings', () => {
  const onPreferenceChange = vi.fn()
  vi.mocked(useDisplayTheme).mockReturnValue({
    onPreferenceChange,
    preference: () => 'bright',
  })

  render(() => <PSettings />)

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

    render(() => <PSettings />)

    expect(screen.getByText('헬스 체크 진단')).toBeInTheDocument()
    vi.unstubAllEnvs()
  },
)

it('should show health checks in the web development runtime', () => {
  vi.stubEnv('DEV', true)
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_POMO_IS_DESKTOP', '')

  render(() => <PSettings />)

  expect(screen.getByText('헬스 체크 진단')).toBeInTheDocument()
  vi.unstubAllEnvs()
})

it('should show health checks in the production web runtime', () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_POMO_IS_DESKTOP', '')

  render(() => <PSettings />)

  expect(screen.getByText('헬스 체크 진단')).toBeInTheDocument()
  vi.unstubAllEnvs()
})

it('should expose the guide and credits as the final settings tabs', () => {
  render(() => <PSettings />)

  expect(screen.queryByRole('button', {name: 'Pomofi 설명서'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '설정 열기'}))
  fireEvent.click(screen.getByRole('button', {name: '포커스 복원'}))

  expect(screen.getByRole('dialog', {name: 'Pomofi 설정'}).hasAttribute('hidden')).toBe(false)
  expect(tabsRootProps?.class).toBe('contents')
  expect(tabsRootProps?.value).toBe('general')
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    '일반',
    '이벤트',
    '피드',
    '대화',
    '사용자',
    '설명서',
    '크레딧',
  ])
  expect(screen.queryByRole('tab', {name: '날씨'})).toBeNull()
})

it('should expose the five-second screen saver delay during development', () => {
  render(() => <PSettings />)

  const screenSaverSelect = vi
    .mocked(PSelect)
    .mock.calls.map(([props]) => props)
    .find((props) => props.label === '스크린 세이버')

  expect(screenSaverSelect?.options).toContainEqual({label: '5초 후', value: '5s'})
})

it('should omit the development-only screen saver delay in production mode', () => {
  vi.stubEnv('DEV', false)
  render(() => <PSettings />)

  const screenSaverSelect = vi
    .mocked(PSelect)
    .mock.calls.map(([props]) => props)
    .find((props) => props.label === '스크린 세이버')

  expect(screenSaverSelect?.options).not.toContainEqual({label: '5초 후', value: '5s'})
  vi.unstubAllEnvs()
})

it('should map the scribble style switch to the scene style value', () => {
  const onSceneStyleChange = vi.fn()

  render(() => <PSettings onSceneStyleChange={onSceneStyleChange} sceneStyle="scribble" />)

  const settingsTrigger = screen.getByRole('button', {name: '설정 열기'})

  expect(settingsTrigger.parentElement?.classList).toContain('pomo-scribble-circle-control')
  expect(
    settingsTrigger.parentElement?.querySelector('.pomo-scribble-circle-border'),
  ).not.toBeNull()
  expect(settingsTrigger.querySelector('.i-pomo-scribble\\:settings')).not.toBeNull()

  const styleSwitch = vi
    .mocked(PSwitch)
    .mock.calls.map(([props]) => props as PSwitchProps)
    .find((props) => props.label === '하찮은 스타일')

  expect(styleSwitch).toMatchObject({
    checked: true,
    description: expect.any(String),
    label: '하찮은 스타일',
  })

  styleSwitch?.onChange(false)
  expect(onSceneStyleChange).toHaveBeenLastCalledWith('original')

  styleSwitch?.onChange(true)
  expect(onSceneStyleChange).toHaveBeenLastCalledWith('scribble')
})

it('should forward every scene, weather, and modal action', () => {
  const onDialogueComposerVisibleChange = vi.fn()
  const onActivityChange = vi.fn()
  const onGazeChange = vi.fn()
  const onMotionInputChange = vi.fn()
  const onMotionModeChange = vi.fn()
  const onSceneStyleChange = vi.fn()
  const onScreenSaverDelayChange = vi.fn()
  const onTimeModeChange = vi.fn()
  const onWeatherLocationChange = vi.fn()
  const onWeatherEnabledChange = vi.fn()
  const onWeatherSceneModeChange = vi.fn()
  render(() => (
    <PSettings
      canUseGyroscope
      dialogueComposerVisible={false}
      onActivityChange={onActivityChange}
      onGazeChange={onGazeChange}
      onDialogueComposerVisibleChange={onDialogueComposerVisibleChange}
      onMotionInputChange={onMotionInputChange}
      onMotionModeChange={onMotionModeChange}
      onSceneStyleChange={onSceneStyleChange}
      onScreenSaverDelayChange={onScreenSaverDelayChange}
      onTimeModeChange={onTimeModeChange}
      onWeatherLocationChange={onWeatherLocationChange}
      onWeatherEnabledChange={onWeatherEnabledChange}
      onWeatherSceneModeChange={onWeatherSceneModeChange}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '설정 열기'}))
  fireEvent.click(screen.getByRole('button', {name: '시간'}))
  fireEvent.click(screen.getByRole('button', {name: '행동'}))
  fireEvent.click(screen.getByRole('button', {name: '보기'}))
  fireEvent.click(screen.getByRole('button', {name: '장면 움직임'}))
  fireEvent.click(screen.getByRole('button', {name: '장면 조작 방식'}))
  fireEvent.click(screen.getByRole('button', {name: '하찮은 스타일'}))
  fireEvent.click(screen.getByRole('button', {name: '스크린 세이버'}))
  fireEvent.click(screen.getByRole('button', {name: '전체 화면'}))
  fireEvent.click(screen.getByRole('button', {name: '화면 자동 꺼짐 방지'}))
  fireEvent.click(screen.getByRole('button', {name: '대화 입력 버튼 표시'}))
  fireEvent.click(screen.getByRole('button', {name: '날씨 변경'}))
  fireEvent.click(screen.getByRole('button', {name: '대화 닫기'}))

  expect(onTimeModeChange).toHaveBeenCalledOnce()
  expect(onActivityChange).toHaveBeenCalledOnce()
  expect(onGazeChange).toHaveBeenCalledOnce()
  expect(onMotionModeChange).toHaveBeenCalledOnce()
  expect(onMotionInputChange).toHaveBeenCalledOnce()
  expect(onSceneStyleChange).toHaveBeenCalledWith('scribble')
  expect(onScreenSaverDelayChange).toHaveBeenCalledWith('10m')
  expect(vi.mocked(useFullscreen).mock.results.at(-1)?.value.onEnabledChange).toHaveBeenCalledWith(
    true,
  )
  expect(onWeatherEnabledChange).toHaveBeenCalledWith(true)
  expect(onWeatherLocationChange).toHaveBeenCalledWith(LEGACY_WEATHER_LOCATIONS.seoul)
  expect(onWeatherSceneModeChange).toHaveBeenCalledWith('rain')
  expect(onDialogueComposerVisibleChange).toHaveBeenCalledWith(true)
  const wakeLockSwitch = vi
    .mocked(PSwitch)
    .mock.calls.map(([props]) => props)
    .find((props) => props.label === '화면 자동 꺼짐 방지')
  expect(Object.getOwnPropertyDescriptor(wakeLockSwitch ?? {}, 'checked')?.get?.()).toBe(false)
  expect(vi.mocked(PModal).mock.calls.at(-1)?.[0].isOpen).toBe(false)
})

it('should keep time, activity, and view together in general settings at every layout size', () => {
  render(() => <PSettings />)
  fireEvent.click(screen.getByRole('button', {name: '설정 열기'}))

  const timeControl = screen.getByRole('button', {name: '시간'})
  const activityControl = screen.getByRole('button', {name: '행동'})
  const viewControl = screen.getByRole('button', {name: '보기'})
  const sceneGroup = timeControl.closest('.pomo-settings__scene')

  expect(sceneGroup).not.toHaveClass('lg:hidden')
  expect(viewControl.closest('.pomo-settings__scene')).toBe(sceneGroup)
  expect(activityControl.closest('.pomo-settings__scene')).toBe(sceneGroup)
  expect(activityControl.closest('.lg\\:hidden')).toBeNull()
})

it('should describe every wake-lock availability state and pending request', () => {
  const states = [
    {availability: () => 'checking' as const, isRequestPending: () => false},
    {availability: () => 'supported' as const, isRequestPending: () => false},
    {availability: () => 'supported' as const, isRequestPending: () => true},
    {availability: () => 'unsupported' as const, isRequestPending: () => false},
  ]

  for (const state of states) {
    vi.mocked(useScreenWakeLock).mockReturnValue({
      ...state,
      errorMessage: () => null,
      isEnabled: () => false,
      onEnabledChange: vi.fn(),
    })
    render(() => <PSettings />)
    expect(
      screen.getAllByRole('button', {hidden: true, name: '화면 자동 꺼짐 방지'}).at(-1),
    ).toHaveAttribute('data-description', expect.any(String))
  }

  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'unsupported',
    errorMessage: () => '권한을 확인할 수 없어요.',
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  render(() => <PSettings />)
  expect(
    screen.getAllByRole('button', {hidden: true, name: '화면 자동 꺼짐 방지'}).at(-1),
  ).toHaveAttribute('data-description', '권한을 확인할 수 없어요.')

  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'future-runtime' as never,
    errorMessage: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  render(() => <PSettings />)
  expect(
    screen.getAllByRole('button', {hidden: true, name: '화면 자동 꺼짐 방지'}).at(-1),
  ).toHaveAttribute('data-description', 'future-runtime')
})

it('should describe every full-screen availability, pending, and failure state', () => {
  const states = [
    {availability: () => 'checking' as const, error: () => null, isRequestPending: () => false},
    {availability: () => 'supported' as const, error: () => null, isRequestPending: () => false},
    {availability: () => 'supported' as const, error: () => null, isRequestPending: () => true},
    {availability: () => 'unsupported' as const, error: () => null, isRequestPending: () => false},
    {
      availability: () => 'supported' as const,
      error: () => 'enter-failed' as const,
      isRequestPending: () => false,
    },
    {
      availability: () => 'supported' as const,
      error: () => 'exit-failed' as const,
      isRequestPending: () => false,
    },
  ]

  for (const state of states) {
    vi.mocked(useFullscreen).mockReturnValue({
      ...state,
      isEnabled: () => false,
      onEnabledChange: vi.fn(),
    })
    render(() => <PSettings />)
    expect(screen.getAllByRole('button', {hidden: true, name: '전체 화면'}).at(-1)).toHaveAttribute(
      'data-description',
      expect.any(String),
    )
  }

  vi.mocked(useFullscreen).mockReturnValue({
    availability: () => 'future-runtime' as never,
    error: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  render(() => <PSettings />)
  expect(screen.getAllByRole('button', {hidden: true, name: '전체 화면'}).at(-1)).toHaveAttribute(
    'data-description',
    'future-runtime',
  )

  vi.mocked(useFullscreen).mockReturnValue({
    availability: () => 'supported',
    error: () => 'future-error' as never,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  render(() => <PSettings />)
  expect(screen.getAllByRole('button', {hidden: true, name: '전체 화면'}).at(-1)).toHaveAttribute(
    'data-description',
    'future-error',
  )
})
