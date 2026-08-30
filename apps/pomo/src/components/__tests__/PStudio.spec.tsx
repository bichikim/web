/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  getPScene,
  supportsPSceneGyroscope,
  usePSceneStyle,
} from '../../features/focus-room-animation'
import {usePEvents} from '../../features/focus-room-dialogue'
import {
  readFocusRoomEntrySession,
  writeFocusRoomEntrySession,
} from '../../features/focus-room-entry'
import {usePScenePreferences} from '../../features/focus-room-scene-preferences'
import {getLocalizedSceneLabel} from '../../features/localization'
import {type ModelDownloadRuntime, PModelDownloadProvider} from '../../features/model-download'
import {getAutomaticScenePeriod, resolveScenePeriod} from '../../features/focus-room-time'
import {usePSay} from '../../features/pomo-webmcp'
import {useWeather, type WeatherLocation} from '../../features/weather'
import {
  isDesktopBackgroundMode,
  useDesktopMode,
  useDesktopSafeAreaTop,
  useDesktopSceneSettingsListener,
} from '../../features/desktop-mode'
import {PEntry} from '../p-studio/Entry'
import {PSceneFallback} from '../p-studio/SceneFallback'
import {PStudioScene} from '../p-studio/Scene'
import {PStudioEvents} from '../p-studio/Events'
import {SceneToolbar} from '../p-studio/Toolbar'
import {useStudioScreenSaver} from '../p-studio/use-screen-saver'
import {PStudio} from '../PStudio'
import {PScreenSaver} from '../PScreenSaver'
import {useDialogueSceneGaze} from '../use-dialogue-scene-gaze'

vi.mock('../../features/focus-room-animation', () => ({
  getPScene: vi.fn(),
  supportsPSceneGyroscope: vi.fn(),
  usePSceneStyle: vi.fn(),
}))
vi.mock('../../features/focus-room-dialogue', () => ({usePEvents: vi.fn()}))
vi.mock('../../features/focus-room-entry', () => ({
  readFocusRoomEntrySession: vi.fn(),
  writeFocusRoomEntrySession: vi.fn(),
}))
vi.mock('../../features/focus-room-scene-preferences', () => ({usePScenePreferences: vi.fn()}))
vi.mock('../../features/localization', () => ({getLocalizedSceneLabel: vi.fn()}))
vi.mock('../../features/focus-room-time', () => ({
  getAutomaticScenePeriod: vi.fn(),
  resolveScenePeriod: vi.fn(),
}))
vi.mock('../../features/pomo-webmcp', () => ({usePSay: vi.fn()}))
vi.mock('../../features/weather', () => ({useWeather: vi.fn()}))
vi.mock('../../features/desktop-mode', () => ({
  isDesktopBackgroundMode: vi.fn(
    (mode: string) => mode === 'desktop' || mode === 'interactiveDesktop',
  ),
  useDesktopMode: vi.fn(),
  useDesktopSafeAreaTop: vi.fn(),
  useDesktopSceneSettingsListener: vi.fn(),
}))
vi.mock('../p-studio/Entry', () => ({PEntry: vi.fn()}))
vi.mock('../p-studio/SceneFallback', () => ({PSceneFallback: vi.fn()}))
vi.mock('../p-studio/Scene', () => ({PStudioScene: vi.fn()}))
vi.mock('../p-studio/Events', () => ({PStudioEvents: vi.fn()}))
vi.mock('../p-studio/Toolbar', () => ({SceneToolbar: vi.fn()}))
vi.mock('../p-studio/use-screen-saver', () => ({useStudioScreenSaver: vi.fn()}))
vi.mock('../PScreenSaver', () => ({PScreenSaver: vi.fn()}))
vi.mock('../use-dialogue-scene-gaze', () => ({useDialogueSceneGaze: vi.fn()}))

interface StudioOptions {
  readonly desktopMode?: 'desktop' | 'interactiveDesktop' | 'normal' | 'widget'
  readonly entrySession?: boolean
  readonly gyroscope?: boolean
  readonly isScreenSaverActive?: boolean
  readonly isReady?: boolean
  readonly styleReady?: boolean
}

const modelDownloadRuntime: ModelDownloadRuntime = {
  createTextClient: () => {
    throw new Error('텍스트 모델 client를 만들면 안 됩니다.')
  },
  createVoiceClient: () => {
    throw new Error('음성 모델 client를 만들면 안 됩니다.')
  },
}

const seoulLocation = {
  country: '대한민국',
  id: 'openweather:legacy:seoul',
  legacyCitySlug: 'seoul',
  name: '서울',
  region: '서울특별시',
} as const satisfies WeatherLocation

const renderStudio = () =>
  render(() => (
    <PModelDownloadProvider runtime={modelDownloadRuntime}>
      <PStudio />
    </PModelDownloadProvider>
  ))

const configureStudio = (options: StudioOptions = {}) => {
  const [hasEntered, setHasEntered] = createSignal(false)
  const [activity, setActivity] = createSignal<'reading' | 'writing'>('reading')
  const [desktopMode, setDesktopMode] = createSignal(options.desktopMode ?? 'normal')
  const [gaze, setGaze] = createSignal<'focused' | 'user'>('focused')
  const [timeMode, setTimeMode] = createSignal<'day' | 'auto'>('day')
  const [sceneStyle, setSceneStyle] = createSignal<'original' | 'scribble'>('original')
  const [weatherEnabled, setWeatherEnabled] = createSignal(false)
  const [weatherLocation, setWeatherLocation] = createSignal<WeatherLocation>(seoulLocation)
  const [weatherSceneMode, setWeatherSceneMode] = createSignal<'auto' | 'rain'>('auto')

  vi.mocked(usePEvents).mockReturnValue({
    activeViseme: () => 'rest',
    enterFocusRoom: () => setHasEntered(true),
    hasEnteredFocusRoom: hasEntered,
    isDialoguePlaying: () => false,
    onStopDialoguePlayback: vi.fn(),
  } as unknown as ReturnType<typeof usePEvents>)
  vi.mocked(usePSay).mockReturnValue({
    activeViseme: () => 'aa',
    isPlaying: () => false,
    speechText: () => '안녕하세요',
  } as unknown as ReturnType<typeof usePSay>)
  vi.mocked(usePScenePreferences).mockReturnValue({
    activity,
    gaze,
    isReady: () => options.isReady ?? true,
    onActivityChange: setActivity,
    onGazeChange: setGaze,
    onTimeModeChange: setTimeMode,
    timeMode,
  } as ReturnType<typeof usePScenePreferences>)
  vi.mocked(usePSceneStyle).mockReturnValue({
    isReady: () => options.styleReady ?? true,
    onSceneStyleChange: setSceneStyle,
    sceneStyle,
  } as ReturnType<typeof usePSceneStyle>)
  vi.mocked(useWeather).mockReturnValue({
    enabled: weatherEnabled,
    location: weatherLocation,
    onEnabledChange: setWeatherEnabled,
    onLocationChange: setWeatherLocation,
    onSceneModeChange: setWeatherSceneMode,
    sceneCondition: () => (weatherSceneMode() === 'rain' ? 'rain' : 'clear'),
    sceneMode: weatherSceneMode,
    state: () => 'idle',
  } as unknown as ReturnType<typeof useWeather>)
  vi.mocked(useDesktopMode).mockReturnValue({
    error: () => null,
    isChanging: () => false,
    mode: desktopMode,
    onModeChange: vi.fn(),
  })
  vi.mocked(useDesktopSafeAreaTop).mockReturnValue(() => 0)
  vi.mocked(useStudioScreenSaver).mockReturnValue({
    currentTrack: () => null,
    delay: () => 300,
    isActive: () => options.isScreenSaverActive ?? false,
    isMusicPlaying: () => false,
    onDelayChange: vi.fn(),
    onDismiss: vi.fn(),
    onMusicPlayingChange: vi.fn(),
    onPomodoroPresentationChange: vi.fn(),
    onTrackChange: vi.fn(),
    timer: () => 0,
  } as unknown as ReturnType<typeof useStudioScreenSaver>)
  vi.mocked(getPScene).mockReturnValue({
    depthSources: {original: 'depth-original.png', scribble: 'depth-scribble.png'},
    id: 'day-reading-focused',
    source: 'scene.png',
  } as ReturnType<typeof getPScene>)
  vi.mocked(getLocalizedSceneLabel).mockImplementation((time, nextActivity, nextGaze) =>
    [time, nextActivity, nextGaze].join('-'),
  )
  vi.mocked(getAutomaticScenePeriod).mockReturnValue('night')
  vi.mocked(resolveScenePeriod).mockImplementation((mode, automaticPeriod) =>
    mode === 'auto' ? automaticPeriod : mode,
  )
  vi.mocked(readFocusRoomEntrySession).mockReturnValue(options.entrySession ?? false)
  vi.mocked(supportsPSceneGyroscope).mockReturnValue(options.gyroscope ?? false)

  return {setDesktopMode}
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  configureStudio()
  vi.mocked(PEntry).mockImplementation((props) => {
    Object.values(props)

    return (
      <>
        <button onClick={props.onEnter} type="button">
          입장
        </button>
        <button onClick={props.onExitComplete} type="button">
          입장 화면 닫기
        </button>
      </>
    )
  })
  vi.mocked(PSceneFallback).mockImplementation(() => <div>장면 대기</div>)
  vi.mocked(PStudioScene).mockImplementation((props) => {
    Object.values(props)

    return (
      <div
        data-motion-input={props.motionInput}
        data-time={props.time}
        data-viseme={props.viseme}
        data-weather={props.weatherCondition}
      >
        <button onClick={() => props.onLoadingChange?.(false)} type="button">
          장면 로드 완료
        </button>
        <button onClick={() => props.onLoadingChange?.(true)} type="button">
          장면 다시 로드
        </button>
      </div>
    )
  })
  vi.mocked(PStudioEvents).mockImplementation((props) => {
    Object.values(props)
    return <div>이벤트</div>
  })
  vi.mocked(SceneToolbar).mockImplementation((props) => {
    Object.values(props)

    return (
      <div data-transitioning={String(props.isSceneTransitioning)}>
        <button onClick={() => props.onActivityChange('writing')} type="button">
          글쓰기
        </button>
        <button onClick={() => props.onGazeChange('user')} type="button">
          사용자 보기
        </button>
        <button onClick={() => props.onMotionInputChange?.('drag')} type="button">
          드래그
        </button>
        <button onClick={() => props.onMotionModeChange?.('pan')} type="button">
          평면
        </button>
        <button onClick={() => props.onSceneStyleChange('scribble')} type="button">
          낙서
        </button>
        <button onClick={() => props.onTimeModeChange('auto')} type="button">
          자동 시간
        </button>
        <button onClick={() => props.onWeatherEnabledChange(true)} type="button">
          날씨 켜기
        </button>
        <button onClick={() => props.onWeatherLocationChange(seoulLocation)} type="button">
          서울
        </button>
        <button onClick={() => props.onWeatherSceneModeChange('rain')} type="button">
          비 장면
        </button>
      </div>
    )
  })
  vi.mocked(PScreenSaver).mockImplementation((props) => {
    Object.values(props)
    return <div data-active={String(props.isActive)}>화면 보호기</div>
  })
  vi.mocked(useDialogueSceneGaze).mockImplementation((sceneGaze) => sceneGaze)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PStudio', () => {
  it('should enter the focus room and pass toolbar changes to the scene', () => {
    configureStudio({gyroscope: true, isScreenSaverActive: true})

    renderStudio()

    expect(screen.getByText('장면 대기')).toBeInTheDocument()
    expect(screen.getByRole('img', {name: 'day-reading-focused'})).toBeInTheDocument()
    expect(screen.queryByText('이벤트')).not.toBeInTheDocument()
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute(
      'data-motion-input',
      'gyroscope',
    )

    fireEvent.click(screen.getByRole('button', {name: '장면 로드 완료'}))
    expect(screen.queryByText('장면 대기')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: '입장'}))
    fireEvent.click(screen.getByRole('button', {name: '입장'}))
    fireEvent.click(screen.getByRole('button', {name: '입장 화면 닫기'}))
    expect(writeFocusRoomEntrySession).toHaveBeenCalledTimes(2)
    expect(screen.getByText('이벤트')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: '글쓰기'}))
    fireEvent.click(screen.getByRole('button', {name: '사용자 보기'}))
    fireEvent.click(screen.getByRole('button', {name: '드래그'}))
    fireEvent.click(screen.getByRole('button', {name: '평면'}))
    fireEvent.click(screen.getByRole('button', {name: '낙서'}))
    fireEvent.click(screen.getByRole('button', {name: '자동 시간'}))
    fireEvent.click(screen.getByRole('button', {name: '날씨 켜기'}))
    fireEvent.click(screen.getByRole('button', {name: '서울'}))
    fireEvent.click(screen.getByRole('button', {name: '비 장면'}))
    fireEvent.click(screen.getByRole('button', {name: '장면 다시 로드'}))

    expect(screen.getByRole('img', {name: 'night-writing-user'})).toBeInTheDocument()
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute('data-time', 'night')
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute('data-weather', 'rain')
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute(
      'data-motion-input',
      'drag',
    )
    expect(document.querySelector('[data-transitioning]')).toHaveAttribute(
      'data-transitioning',
      'true',
    )
  })

  it('should restore a stored entry session without creating the scene before preferences are ready', () => {
    configureStudio({entrySession: true, isReady: false, styleReady: false})

    renderStudio()

    expect(readFocusRoomEntrySession).toHaveBeenCalledOnce()
    expect(screen.getByText('이벤트')).toBeInTheDocument()
    expect(screen.queryByText('입장')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', {name: '장면 로드 완료'})).not.toBeInTheDocument()
  })

  it('should keep only the scene visible while the window is the desktop background', () => {
    configureStudio({desktopMode: 'desktop', entrySession: true})

    renderStudio()

    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.queryByText('이벤트')).not.toBeInTheDocument()
    expect(SceneToolbar).not.toHaveBeenCalled()
  })

  it('should keep the studio controls on the interactive desktop background', () => {
    configureStudio({desktopMode: 'interactiveDesktop', entrySession: true})

    renderStudio()

    expect(screen.getByText('이벤트')).toBeInTheDocument()
    expect(SceneToolbar).toHaveBeenCalled()
    expect(useDesktopSceneSettingsListener).toHaveBeenCalledOnce()
  })

  it('should expose the desktop safe area to controls without padding the scene', () => {
    configureStudio({desktopMode: 'interactiveDesktop', entrySession: true})
    vi.mocked(useDesktopSafeAreaTop).mockReturnValue(() => 24)

    renderStudio()

    const studio = screen.getByLabelText('Pomo')
    expect(studio.style.getPropertyValue('--pomo-safe-area-inset-top')).toBe('24px')
    expect(screen.getByRole('img')).not.toHaveStyle({paddingTop: '24px'})
  })

  it('should suspend the screen saver only while the window is the desktop background', () => {
    const {setDesktopMode} = configureStudio({entrySession: true, isScreenSaverActive: true})

    renderStudio()

    expect(screen.getByText('화면 보호기')).toHaveAttribute('data-active', 'true')

    setDesktopMode('desktop')
    expect(screen.getByText('화면 보호기')).toHaveAttribute('data-active', 'false')

    setDesktopMode('interactiveDesktop')
    expect(screen.getByText('화면 보호기')).toHaveAttribute('data-active', 'false')

    setDesktopMode('normal')
    expect(screen.getByText('화면 보호기')).toHaveAttribute('data-active', 'true')
    expect(isDesktopBackgroundMode).toHaveBeenCalledWith('interactiveDesktop')
  })
})
