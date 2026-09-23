/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {screen} from '@solidjs/testing-library'
import {
  configureStudio,
  renderStudio,
  seoulLocation,
  setupStudio,
  studioMocks,
} from '../../__tests__/p-studio/setup'

const {
  PStudioScene,
  isDesktopBackgroundMode,
  SceneToolbar,
  useDesktopSafeAreaTop,
  useDesktopSceneSettingsPublisher,
  usePScenePreferences,
  useStudioScreenSaver,
} = studioMocks

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = []
  readonly close = vi.fn()
  readonly listeners: Array<(event: MessageEvent) => void> = []
  readonly postMessage = vi.fn()

  constructor(readonly name: string) {
    TestBroadcastChannel.instances.push(this)
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener)
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    const listenerIndex = this.listeners.indexOf(listener)
    if (listenerIndex >= 0) {
      this.listeners.splice(listenerIndex, 1)
    }
  }

  dispatch(data: unknown) {
    for (const listener of this.listeners) {
      listener(new MessageEvent('message', {data}))
    }
  }
}

beforeEach(setupStudio)
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('PStudio', () => {
  it('should enter the focus room without showing the entry screen in the desktop app', () => {
    vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
    configureStudio({desktopMode: 'normal'})

    renderStudio()

    expect(screen.queryByRole('button', {name: '입장'})).not.toBeInTheDocument()
    expect(screen.getByText('이벤트')).toBeInTheDocument()
  })

  it('should keep the entry screen in the web app', () => {
    vi.stubEnv('VITE_POMO_IS_DESKTOP', '')
    configureStudio({desktopMode: 'normal'})

    renderStudio()

    expect(screen.getByRole('button', {name: '입장'})).toBeInTheDocument()
  })

  it('should leave the normal desktop scene transparent for the native website layer', () => {
    vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
    configureStudio({
      backgroundMode: 'website',
      desktopMode: 'normal',
      entrySession: true,
      websiteUrl: 'https://example.com/dashboard',
    })

    renderStudio()

    expect(screen.getByLabelText('Pomo')).toBeInTheDocument()
    expect(screen.queryByTitle('웹사이트 주소')).not.toBeInTheDocument()
    expect(vi.mocked(studioMocks.synchronizeDesktopBackground)).toHaveBeenCalled()
  })

  it('should keep the character scene visible until a desktop website URL is saved', () => {
    vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
    configureStudio({
      backgroundMode: 'website',
      desktopMode: 'normal',
      entrySession: true,
    })

    renderStudio()

    expect(screen.getByRole('img', {name: 'day-reading-focused'})).toBeInTheDocument()
    expect(screen.queryByText('frame player')).not.toBeInTheDocument()
  })

  it('should not reload the website background for unrelated background preference changes', () => {
    vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
    const {setBackgroundPreferences} = configureStudio({
      backgroundMode: 'website',
      desktopMode: 'normal',
      entrySession: true,
      websiteUrl: 'https://example.com/dashboard',
    })

    renderStudio()

    expect(vi.mocked(studioMocks.synchronizeDesktopBackground)).toHaveBeenCalledOnce()

    setBackgroundPreferences((preferences) => ({...preferences, photoSeconds: 30}))
    expect(vi.mocked(studioMocks.synchronizeDesktopBackground)).toHaveBeenCalledOnce()

    setBackgroundPreferences((preferences) => ({
      ...preferences,
      websiteUrl: 'https://example.com/updated',
    }))
    expect(vi.mocked(studioMocks.synchronizeDesktopBackground)).toHaveBeenCalledTimes(2)
  })

  it('should keep the website event relay interactive when the desktop background is click-through', () => {
    vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
    configureStudio({
      backgroundMode: 'website',
      desktopMode: 'desktop',
      entrySession: true,
      websiteUrl: 'https://example.com/dashboard',
    })

    renderStudio()

    expect(screen.getByLabelText('Pomo').querySelector('.pointer-events-auto')).toBeInTheDocument()
  })

  it('should keep only the scene visible while the window is the desktop background', () => {
    const {registerEventActionExecutor} = configureStudio({
      desktopMode: 'desktop',
      entrySession: true,
    })

    renderStudio()

    expect(screen.getByLabelText('Pomo')).toHaveClass('pointer-events-none')
    expect(screen.queryByText('장면 대기')).not.toBeInTheDocument()
    expect(screen.queryByText('이벤트')).not.toBeInTheDocument()
    expect(screen.queryByText('투어')).not.toBeInTheDocument()
    expect(screen.queryByText('화면 보호기')).not.toBeInTheDocument()
    expect(vi.mocked(PStudioScene).mock.calls[0]?.[0].interactive).toBe(false)
    expect(SceneToolbar).not.toHaveBeenCalled()
    expect(registerEventActionExecutor).toHaveBeenCalledExactlyOnceWith(expect.any(Function), {
      mode: 'deferred',
    })
  })

  it('should forward desktop wallpaper music actions to the desktop player', () => {
    const {registerEventActionHandler} = configureStudio({
      desktopMode: 'desktop',
      entrySession: true,
    })
    TestBroadcastChannel.instances = []
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)

    renderStudio()

    const handler = registerEventActionHandler.mock.calls[0]?.[0]
    if (handler === undefined) {
      throw new Error('Expected the desktop wallpaper event action handler to be registered.')
    }

    TestBroadcastChannel.instances[0]?.dispatch({type: 'player-ready'})
    expect(handler('music-stop')).toBe(true)

    expect(TestBroadcastChannel.instances[0]?.postMessage).toHaveBeenNthCalledWith(2, {
      actionId: 'music-stop',
    })
  })

  it('should keep music actions until the desktop player subscribes', () => {
    const {registerEventActionHandler} = configureStudio({
      desktopMode: 'desktop',
      entrySession: true,
    })
    TestBroadcastChannel.instances = []
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)

    renderStudio()

    const handler = registerEventActionHandler.mock.calls[0]?.[0]
    const channel = TestBroadcastChannel.instances[0]
    if (handler === undefined || channel === undefined) {
      throw new Error('Expected the desktop wallpaper action bridge to be ready.')
    }

    expect(handler('music-start')).toBe(true)
    expect(handler('music-stop')).toBe(true)
    expect(channel.postMessage).toHaveBeenCalledExactlyOnceWith({type: 'request-player-ready'})

    channel.dispatch({type: 'player-ready'})

    expect(channel.postMessage).toHaveBeenNthCalledWith(2, {actionId: 'music-start'})
    expect(channel.postMessage).toHaveBeenNthCalledWith(3, {actionId: 'music-stop'})
  })

  it('should queue music actions again after the desktop player disconnects', () => {
    const {registerEventActionHandler} = configureStudio({
      desktopMode: 'desktop',
      entrySession: true,
    })
    TestBroadcastChannel.instances = []
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)

    renderStudio()

    const handler = registerEventActionHandler.mock.calls[0]?.[0]
    const channel = TestBroadcastChannel.instances[0]
    if (handler === undefined || channel === undefined) {
      throw new Error('Expected the desktop wallpaper action bridge to be ready.')
    }

    channel.dispatch({type: 'player-ready'})
    expect(handler('music-stop')).toBe(true)
    expect(channel.postMessage).toHaveBeenNthCalledWith(2, {actionId: 'music-stop'})

    channel.dispatch({type: 'player-unavailable'})
    expect(handler('music-start')).toBe(true)
    expect(channel.postMessage).toHaveBeenCalledTimes(2)

    channel.dispatch({type: 'player-ready'})
    expect(channel.postMessage).toHaveBeenNthCalledWith(3, {actionId: 'music-start'})
  })

  it('should keep the studio controls on the interactive desktop background', () => {
    configureStudio({desktopMode: 'interactiveDesktop', entrySession: true})

    renderStudio()

    expect(screen.getByLabelText('Pomo')).not.toHaveClass('pointer-events-none')
    expect(vi.mocked(PStudioScene).mock.calls[0]?.[0].interactive).toBe(true)
    expect(screen.getByText('이벤트')).toBeInTheDocument()
    expect(SceneToolbar).toHaveBeenCalled()
    expect(useDesktopSceneSettingsPublisher).toHaveBeenCalledOnce()
  })

  it('should render a move handle on the mini widget surface', () => {
    vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
    configureStudio({desktopMode: 'widget', entrySession: true})

    renderStudio()

    expect(screen.getByLabelText('Pomo')).toHaveClass('rounded-panel')
    const handle = screen.getByRole('button', {name: '미니 위젯 이동 손잡이'})
    expect(handle).toHaveAttribute('data-tauri-drag-region')
    expect(handle).toHaveClass('cursor-move')
  })

  it('should expose the desktop safe area to controls without padding the scene', () => {
    configureStudio({desktopMode: 'interactiveDesktop', entrySession: true})
    vi.mocked(useDesktopSafeAreaTop).mockReturnValue(() => 24)

    renderStudio()

    const studio = screen.getByLabelText('Pomo')
    expect(studio.style.getPropertyValue('--pomo-safe-area-inset-top')).toBe('24px')
    expect(screen.getByRole('img')).not.toHaveStyle({paddingTop: '24px'})
  })

  it('should preserve the CSS safe area when no native desktop inset is measured', () => {
    configureStudio({entrySession: true})
    vi.mocked(useDesktopSafeAreaTop).mockReturnValue(() => 0)

    renderStudio()

    const studio = screen.getByLabelText('Pomo')
    expect(studio.style.getPropertyValue('--pomo-safe-area-inset-top')).toBe('')
  })

  it('should suspend the screen saver only while the window is the desktop background', () => {
    const {setDesktopMode} = configureStudio({entrySession: true, isScreenSaverActive: true})

    renderStudio()

    expect(screen.getByText('화면 보호기')).toHaveAttribute('data-active', 'true')

    setDesktopMode('desktop')
    expect(screen.queryByText('화면 보호기')).not.toBeInTheDocument()

    setDesktopMode('interactiveDesktop')
    expect(screen.getByText('화면 보호기')).toHaveAttribute('data-active', 'false')

    setDesktopMode('normal')
    expect(screen.getByText('화면 보호기')).toHaveAttribute('data-active', 'true')
    expect(isDesktopBackgroundMode).toHaveBeenCalledWith('interactiveDesktop')
  })
})

it.each(['interactiveDesktop', 'widget'] as const)(
  'should synchronize scene edits without echoing in %s mode',
  (desktopMode) => {
    configureStudio({desktopMode, entrySession: true})
    const location = {
      ...seoulLocation,
      id: 'openweather:legacy:jeju',
      legacyCitySlug: 'jeju',
      name: '제주',
    } as const
    const publish = vi.fn()
    vi.mocked(useDesktopSceneSettingsPublisher).mockReturnValue({publish})
    renderStudio()
    const toolbar = vi.mocked(SceneToolbar).mock.calls[0]?.[0]
    const listener = vi.mocked(useDesktopSceneSettingsPublisher).mock.calls[0]?.[0]?.handlers
    if (listener === undefined) {
      throw new Error('Missing scene-settings listener')
    }
    if (toolbar === undefined) {
      throw new Error('Missing scene toolbar')
    }
    expect(publish).not.toHaveBeenCalled()

    toolbar.onActivityChange('writing')
    toolbar.onGazeChange('user')
    toolbar.onMotionInputChange?.('gyroscope')
    toolbar.onMotionModeChange?.('pan')
    toolbar.onSceneStyleChange('scribble')
    toolbar.onScreenSaverDelayChange('1h')
    toolbar.onTimeModeChange('auto')
    toolbar.onWeatherEnabledChange(true)
    toolbar.onWeatherLocationChange(location)
    toolbar.onWeatherSceneModeChange('rain')
    expect(publish.mock.calls.map(([setting]) => setting)).toEqual([
      {name: 'activity', value: 'writing'},
      {name: 'gaze', value: 'user'},
      {name: 'motionInput', value: 'gyroscope'},
      {name: 'motionMode', value: 'pan'},
      {name: 'sceneStyle', value: 'scribble'},
      {name: 'screenSaverDelay', value: '1h'},
      {name: 'timeMode', value: 'auto'},
      {name: 'weatherEnabled', value: true},
      {name: 'weatherLocation', value: location},
      {name: 'weatherSceneMode', value: 'rain'},
    ])
    expect(toolbar).toMatchObject({
      activity: 'writing',
      motionInput: 'gyroscope',
      motionMode: 'pan',
      sceneStyle: 'scribble',
      timeMode: 'auto',
      weatherEnabled: true,
      weatherLocation: location,
      weatherSceneMode: 'rain',
    })
    expect(usePScenePreferences().gaze()).toBe('user')
    expect(useStudioScreenSaver().onDelayChange).toHaveBeenLastCalledWith('1h')
    listener.onActivityChange?.('reading')
    listener.onGazeChange?.('focused')
    listener.onMotionInputChange?.('drag')
    listener.onMotionModeChange?.('depth')
    listener.onSceneStyleChange?.('original')
    listener.onScreenSaverDelayChange?.('off')
    listener.onTimeModeChange?.('day')
    listener.onWeatherEnabledChange?.(false)
    listener.onWeatherLocationChange?.(seoulLocation)
    listener.onWeatherSceneModeChange?.('auto')
    expect(toolbar).toMatchObject({
      activity: 'reading',
      motionInput: 'drag',
      motionMode: 'depth',
      sceneStyle: 'original',
      timeMode: 'day',
      weatherEnabled: false,
      weatherLocation: seoulLocation,
      weatherSceneMode: 'auto',
    })
    expect(usePScenePreferences().gaze()).toBe('focused')
    expect(useStudioScreenSaver().onDelayChange).toHaveBeenLastCalledWith('off')
    expect(publish).toHaveBeenCalledTimes(10)
    toolbar.onActivityChange('writing')
    expect(publish).toHaveBeenCalledTimes(11)
    expect(publish).toHaveBeenLastCalledWith({name: 'activity', value: 'writing'})
  },
)

it('should connect renderer input fallback to desktop publishing', () => {
  configureStudio({desktopMode: 'interactiveDesktop', entrySession: true, gyroscope: true})
  const publish = vi.fn()
  vi.mocked(useDesktopSceneSettingsPublisher).mockReturnValue({publish})
  renderStudio()
  vi.mocked(PStudioScene).mock.calls[0]?.[0].onMotionInputChange?.('drag')
  expect(publish).toHaveBeenCalledExactlyOnceWith({name: 'motionInput', value: 'drag'})
  expect(vi.mocked(SceneToolbar).mock.calls[0]?.[0].motionInput).toBe('drag')
})
