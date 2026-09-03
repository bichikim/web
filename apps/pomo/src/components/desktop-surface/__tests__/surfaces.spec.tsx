/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {supportsPSceneGyroscope, usePSceneStyle} from '../../../features/focus-room-animation'
import {usePScenePreferences} from '../../../features/focus-room-scene-preferences'
import {useScreenSaver} from '../../../features/screen-saver'
import {
  useDesktopMode,
  useDesktopSceneSettingsListener,
  useDesktopSceneSettingsPublisher,
} from '../../../features/desktop-mode'
import {useWeather, type WeatherLocation} from '../../../features/weather'
import {PMusicPlayer} from '../../PMusicPlayer'
import {PPomodoro} from '../../PPomodoro'
import {SceneToolbar} from '../../p-studio/Toolbar'
import {DesktopSurfaceFrame} from '../Frame'
import {DesktopPlayer} from '../Player'
import {DesktopPomodoro} from '../Pomodoro'
import {DesktopSettings} from '../Settings'

vi.mock('@solidjs/meta', () => ({Title: (props: {readonly children?: unknown}) => props.children}))
vi.mock('../../../features/focus-room-animation', () => ({
  supportsPSceneGyroscope: vi.fn(),
  usePSceneStyle: vi.fn(),
}))
vi.mock('../../../features/focus-room-scene-preferences', () => ({
  usePScenePreferences: vi.fn(),
}))
vi.mock('../../../features/screen-saver', () => ({useScreenSaver: vi.fn()}))
vi.mock('../../../features/desktop-mode', () => ({
  useDesktopMode: vi.fn(),
  useDesktopSceneSettingsListener: vi.fn(),
  useDesktopSceneSettingsPublisher: vi.fn(),
}))
vi.mock('../../../features/weather', () => ({useWeather: vi.fn()}))
vi.mock('../../PMusicPlayer', () => ({
  PMusicPlayer: vi.fn((props) => (
    <div data-expanded={String(props.expanded)} data-style={props.sceneStyle}>
      플레이어
    </div>
  )),
}))
vi.mock('../../PPomodoro', () => ({
  PPomodoro: vi.fn((props) => <div data-style={props.sceneStyle}>포모도로</div>),
}))
vi.mock('../../p-studio/Toolbar', () => ({
  SceneToolbar: vi.fn((props) => {
    Object.values(props)
    return (
      <div>
        <span data-layout={props.layout}>설정</span>
        <button onClick={() => props.onActivityChange('writing')} type="button">
          활동
        </button>
        <button onClick={() => props.onGazeChange('user')} type="button">
          시선
        </button>
        <button onClick={() => props.onMotionInputChange('drag')} type="button">
          입력
        </button>
        <button onClick={() => props.onMotionModeChange('pan')} type="button">
          움직임
        </button>
        <button onClick={() => props.onSceneStyleChange('scribble')} type="button">
          스타일
        </button>
        <button onClick={() => props.onScreenSaverDelayChange('1h')} type="button">
          화면 보호기
        </button>
        <button onClick={() => props.onTimeModeChange('auto')} type="button">
          시간
        </button>
        <button onClick={() => props.onWeatherLocationChange(jejuLocation)} type="button">
          도시
        </button>
        <button onClick={() => props.onWeatherEnabledChange(true)} type="button">
          날씨
        </button>
        <button onClick={() => props.onWeatherSceneModeChange('rain')} type="button">
          날씨 장면
        </button>
        <button onClick={() => props.onDesktopModeChange('interactiveDesktop')} type="button">
          모드
        </button>
      </div>
    )
  }),
}))

const seoulLocation = {
  country: '대한민국',
  id: 'openweather:legacy:seoul',
  legacyCitySlug: 'seoul',
  name: '서울',
  region: '서울특별시',
} as const satisfies WeatherLocation

const jejuLocation = {
  country: '대한민국',
  id: 'openweather:legacy:jeju',
  legacyCitySlug: 'jeju',
  name: '제주',
  region: '제주특별자치도',
} as const satisfies WeatherLocation

const publish = vi.fn()
const onModeChange = vi.fn().mockResolvedValue(undefined)
let mode: 'desktop' | 'normal' = 'desktop'

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mode = 'desktop'
  vi.mocked(useDesktopMode).mockImplementation(() => ({
    error: () => null,
    isChanging: () => false,
    mode: () => mode,
    onModeChange,
  }))
  vi.mocked(usePSceneStyle).mockImplementation(() => {
    const [sceneStyle, onSceneStyleChange] = createSignal<'original' | 'scribble'>('original')
    return {isReady: () => true, onSceneStyleChange, sceneStyle}
  })
  vi.mocked(usePScenePreferences).mockImplementation(() => {
    const [activity, onActivityChange] = createSignal<'reading' | 'writing'>('reading')
    const [gaze, onGazeChange] = createSignal<'focused' | 'user'>('focused')
    const [timeMode, onTimeModeChange] = createSignal<'auto' | 'day'>('day')
    return {
      activity,
      gaze,
      isReady: () => true,
      onActivityChange,
      onGazeChange,
      onTimeModeChange,
      timeMode,
    }
  })
  vi.mocked(useScreenSaver).mockReturnValue({
    delay: () => '10m',
    isActive: () => false,
    onDelayChange: vi.fn(),
    onDismiss: vi.fn(),
  })
  vi.mocked(useWeather).mockReturnValue({
    enabled: () => false,
    location: () => seoulLocation,
    onEnabledChange: vi.fn(),
    onLocationChange: vi.fn(),
    onSceneModeChange: vi.fn(),
    sceneCondition: () => 'clear',
    sceneMode: () => 'auto',
    state: () => ({status: 'disabled'}),
  })
  vi.mocked(useDesktopSceneSettingsPublisher).mockReturnValue({publish})
  vi.mocked(supportsPSceneGyroscope).mockReturnValue(true)
})

afterEach(() => {
  vi.useRealTimers()
  document.documentElement.style.removeProperty('background')
  document.body.style.removeProperty('background')
})

it('should render frame content only while its surface is visible', () => {
  document.body.style.background = 'red'
  const hidden = render(() => (
    <DesktopSurfaceFrame accessibleLabel="표면" isVisible={false} title="제목">
      <p>내용</p>
    </DesktopSurfaceFrame>
  ))
  expect(hidden.container.querySelector('main')).toHaveClass('pomo-desktop-surface')
  expect(document.documentElement.style.getPropertyValue('background')).toBe('')
  expect(document.body.style.getPropertyValue('background')).toBe('red')
  expect(screen.queryByText('내용')).not.toBeInTheDocument()

  hidden.unmount()
  expect(document.body.style.getPropertyValue('background')).toBe('red')
  render(() => (
    <DesktopSurfaceFrame accessibleLabel="표면" class="custom" isVisible title="제목">
      <p>내용</p>
    </DesktopSurfaceFrame>
  ))
  expect(screen.getByRole('region', {name: '표면'})).toHaveAttribute(
    'data-tauri-drag-region',
    'deep',
  )
  expect(screen.getByRole('region', {name: '표면'})).toHaveClass('custom')
})

it('should render dedicated player and Pomodoro surfaces with synchronized style', () => {
  const view = render(() => (
    <>
      <DesktopPlayer />
      <DesktopPomodoro />
    </>
  ))

  expect(screen.getByText('플레이어')).toHaveAttribute('data-expanded', 'true')
  expect(screen.getByText('포모도로')).toHaveAttribute('data-style', 'original')
  expect(PMusicPlayer).toHaveBeenCalledOnce()
  expect(PPomodoro).toHaveBeenCalledOnce()
  expect(useDesktopSceneSettingsListener).toHaveBeenCalledTimes(2)

  view.unmount()
  mode = 'normal'
  render(() => <DesktopPlayer />)
  expect(screen.queryByText('플레이어')).not.toBeInTheDocument()
})

it('should publish every setting change from the separate scene toolbar', () => {
  render(() => <DesktopSettings />)

  expect(SceneToolbar).toHaveBeenCalledOnce()
  expect(screen.getByText('설정')).toHaveAttribute('data-layout', 'surface')
  for (const name of [
    '활동',
    '시선',
    '입력',
    '움직임',
    '스타일',
    '화면 보호기',
    '시간',
    '도시',
    '날씨',
    '날씨 장면',
    '모드',
  ]) {
    fireEvent.click(screen.getByRole('button', {name}))
  }

  expect(publish.mock.calls.map(([setting]) => setting)).toEqual([
    {name: 'activity', value: 'writing'},
    {name: 'gaze', value: 'user'},
    {name: 'motionInput', value: 'drag'},
    {name: 'motionMode', value: 'pan'},
    {name: 'sceneStyle', value: 'scribble'},
    {name: 'screenSaverDelay', value: '1h'},
    {name: 'timeMode', value: 'auto'},
    {name: 'weatherLocation', value: jejuLocation},
    {name: 'weatherEnabled', value: true},
    {name: 'weatherSceneMode', value: 'rain'},
  ])
  expect(onModeChange).toHaveBeenCalledWith('interactiveDesktop')
})

it('should retain drag input when the desktop has no gyroscope', () => {
  vi.mocked(supportsPSceneGyroscope).mockReturnValue(false)
  render(() => <DesktopSettings />)

  expect(vi.mocked(SceneToolbar).mock.calls[0]?.[0].motionInput).toBe('drag')
})
