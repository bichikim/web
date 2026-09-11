/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {vi} from 'vitest'

import {
  isDesktopBackgroundMode,
  useDesktopMode,
  useDesktopSafeAreaTop,
  useDesktopSceneSettingsPublisher,
} from 'src/features/desktop-mode'
import {getPScene, supportsPSceneGyroscope, usePSceneStyle} from 'src/features/focus-room-animation'
import {usePEvents} from 'src/features/focus-room-dialogue/event-context'
import {usePDisplayPreferences} from 'src/features/focus-room-display-preferences'
import {readFocusRoomEntrySession, writeFocusRoomEntrySession} from 'src/features/focus-room-entry'
import {usePScenePreferences} from 'src/features/focus-room-scene-preferences'
import {getAutomaticScenePeriod, resolveScenePeriod} from 'src/features/focus-room-time'
import {getLocalizedSceneLabel} from 'src/features/localization'
import {type ModelDownloadRuntime, PModelDownloadProvider} from 'src/features/model-download'
import {usePSay} from 'src/features/pomo-webmcp'
import {useWeather, type WeatherLocation} from 'src/features/weather'
import {PEntry} from 'src/components/p-studio/Entry'
import {PStudioEvents} from 'src/components/p-studio/Events'
import {PStudioScene} from 'src/components/p-studio/Scene'
import {PSceneFallback} from 'src/components/p-studio/SceneFallback'
import {SceneToolbar} from 'src/components/p-studio/Toolbar'
import {PStudioTourHint} from 'src/components/p-studio/TourHint'
import {useStudioScreenSaver} from 'src/components/p-studio/use-screen-saver'
import {PScreenSaver} from 'src/components/PScreenSaver'
import {PStudio} from 'src/components/PStudio'
import {DEFAULT_BACKGROUND, useBackground} from 'src/features/background'
import {Player as FramePlayer} from 'src/components/frame/Player'
import {PTour} from 'src/components/tour/PTour'
import {useDialogueSceneGaze} from 'src/components/use-dialogue-scene-gaze'

vi.mock('src/features/focus-room-animation', () => ({
  getPScene: vi.fn(),
  supportsPSceneGyroscope: vi.fn(),
  usePSceneStyle: vi.fn(),
}))
vi.mock('src/features/focus-room-dialogue/event-context', () => ({usePEvents: vi.fn()}))
vi.mock('src/features/focus-room-display-preferences', () => ({usePDisplayPreferences: vi.fn()}))
vi.mock('src/features/focus-room-entry', () => ({
  readFocusRoomEntrySession: vi.fn(),
  writeFocusRoomEntrySession: vi.fn(),
}))
vi.mock('src/features/focus-room-scene-preferences', () => ({usePScenePreferences: vi.fn()}))
vi.mock('src/features/localization', () => ({getLocalizedSceneLabel: vi.fn()}))
vi.mock('src/features/focus-room-time', () => ({
  getAutomaticScenePeriod: vi.fn(),
  resolveScenePeriod: vi.fn(),
}))
vi.mock('src/features/pomo-webmcp', () => ({usePSay: vi.fn()}))
vi.mock('src/features/weather', () => ({useWeather: vi.fn()}))
vi.mock('src/features/desktop-mode', () => ({
  isDesktopBackgroundMode: vi.fn(
    (mode: string) => mode === 'desktop' || mode === 'interactiveDesktop',
  ),
  useDesktopMode: vi.fn(),
  useDesktopSafeAreaTop: vi.fn(),
  useDesktopSceneSettingsPublisher: vi.fn(),
}))
vi.mock('src/features/background', () => ({
  DEFAULT_BACKGROUND: {mode: 'character', order: 'sequential', photoSeconds: 10},
  useBackground: vi.fn(),
}))
vi.mock('src/components/frame/Player', () => ({Player: vi.fn()}))
vi.mock('src/components/p-studio/Entry', () => ({PEntry: vi.fn()}))
vi.mock('src/components/p-studio/SceneFallback', () => ({PSceneFallback: vi.fn()}))
vi.mock('src/components/p-studio/Scene', () => ({PStudioScene: vi.fn()}))
vi.mock('src/components/p-studio/Events', () => ({PStudioEvents: vi.fn()}))
vi.mock('src/components/p-studio/Toolbar', () => ({SceneToolbar: vi.fn()}))
vi.mock('src/components/p-studio/TourHint', () => ({PStudioTourHint: vi.fn()}))
vi.mock('src/components/p-studio/use-screen-saver', () => ({useStudioScreenSaver: vi.fn()}))
vi.mock('src/components/PScreenSaver', () => ({PScreenSaver: vi.fn()}))
vi.mock('src/components/tour/PTour', () => ({PTour: vi.fn()}))
vi.mock('src/components/use-dialogue-scene-gaze', () => ({useDialogueSceneGaze: vi.fn()}))

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

export const seoulLocation = {
  country: '대한민국',
  id: 'openweather:legacy:seoul',
  legacyCitySlug: 'seoul',
  name: '서울',
  region: '서울특별시',
} as const satisfies WeatherLocation

export const renderStudio = () =>
  render(() => (
    <PModelDownloadProvider runtime={modelDownloadRuntime}>
      <PStudio />
    </PModelDownloadProvider>
  ))

export const configureStudio = (options: StudioOptions = {}) => {
  const [hasEntered, setHasEntered] = createSignal(false)
  const [activity, setActivity] = createSignal<'reading' | 'writing'>('reading')
  const [desktopMode, setDesktopMode] = createSignal(options.desktopMode ?? 'normal')
  const [dialogueComposerVisible, setDialogueComposerVisible] = createSignal(false)
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
  vi.mocked(usePDisplayPreferences).mockReturnValue({
    dialogueComposerVisible,
    isReady: () => true,
    memoryAssistVisible: () => true,
    onDialogueComposerVisibleChange: setDialogueComposerVisible,
    onMemoryAssistVisibleChange: vi.fn(),
    onPlayerVisibleChange: vi.fn(),
    onPomodoroVisibleChange: vi.fn(),
    onToolsButtonVisibleChange: vi.fn(),
    onTourButtonVisibleChange: vi.fn(),
    playerVisible: () => true,
    pomodoroVisible: () => true,
    toolsButtonVisible: () => true,
    tourButtonVisible: () => true,
  })
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
    delay: () => '5s',
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

export const publish = vi.fn()

export const setupStudio = () => {
  vi.mocked(useDesktopSceneSettingsPublisher).mockReturnValue({publish})
  vi.mocked(useBackground).mockReturnValue({
    add: vi.fn(),
    busy: () => false,
    configure: vi.fn(),
    error: () => null,
    failedIds: () => [],
    items: () => [],
    load: vi.fn(),
    markFailed: vi.fn(),
    pick: vi.fn(),
    preferences: () => DEFAULT_BACKGROUND,
    ready: () => true,
    remove: vi.fn(),
    retry: vi.fn(),
  })
  vi.mocked(FramePlayer).mockImplementation(() => <div>frame player</div>)

  vi.useFakeTimers()
  vi.clearAllMocks()
  configureStudio()
  vi.mocked(PEntry).mockImplementation((props) => {
    Object.values(props)

    return (
      <>
        <button onClick={() => props.onEnter()} type="button">
          입장
        </button>
        <button onClick={() => props.onExitComplete()} type="button">
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
    return (
      <div data-dialogue-composer-visible={String(props.dialogueComposerVisible)}>
        이벤트
        <div class="pomo-pomodoro">포모도로</div>
        <div class="pomo-player-stage">음악</div>
      </div>
    )
  })
  vi.mocked(SceneToolbar).mockImplementation((props) => {
    Object.values(props)

    return (
      <div data-tour-step="settings" data-transitioning={String(props.isSceneTransitioning)}>
        <button onClick={() => props.onTourOpen?.()} type="button">
          둘러보기
        </button>
        <div data-tour-step="memory-assist">기억 보조</div>
        <button onClick={() => props.onActivityChange('writing')} type="button">
          글쓰기
        </button>
        <button onClick={() => props.onGazeChange('user')} type="button">
          사용자 보기
        </button>
        <button onClick={() => props.onDialogueComposerVisibleChange?.(true)} type="button">
          대화 입력 표시
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
  vi.mocked(PTour).mockImplementation((props) => {
    Object.values(props)
    return <div data-open={String(props.isOpen)}>투어</div>
  })
  vi.mocked(PStudioTourHint).mockImplementation((props) => {
    Object.values(props)
    return <div>첫 입장 투어 안내</div>
  })
  vi.mocked(useDialogueSceneGaze).mockImplementation((sceneGaze) => sceneGaze)
}

export const studioMocks = {
  DEFAULT_BACKGROUND,
  isDesktopBackgroundMode,
  PTour,
  readFocusRoomEntrySession,
  SceneToolbar,
  useBackground,
  useDesktopSafeAreaTop,
  useDesktopSceneSettingsPublisher,
  usePScenePreferences,
  useStudioScreenSaver,
  writeFocusRoomEntrySession,
}
