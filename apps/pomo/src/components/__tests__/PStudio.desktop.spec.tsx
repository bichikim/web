/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {screen} from '@solidjs/testing-library'
import {
  configureStudio,
  publish,
  renderStudio,
  seoulLocation,
  setupStudio,
  studioMocks,
} from './p-studio/setup'

const {
  isDesktopBackgroundMode,
  SceneToolbar,
  useDesktopSafeAreaTop,
  useDesktopSceneSettingsPublisher,
} = studioMocks

beforeEach(setupStudio)
afterEach(() => {
  vi.useRealTimers()
})

describe('PStudio', () => {
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
    expect(useDesktopSceneSettingsPublisher).toHaveBeenCalledOnce()
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
  it('should publish every main toolbar setting and not echo received changes', () => {
    configureStudio({desktopMode: 'interactiveDesktop', entrySession: true})
    renderStudio()
    const toolbar = vi.mocked(SceneToolbar).mock.calls[0]?.[0]
    if (!toolbar) {
      throw new Error('Scene toolbar was not rendered')
    }
    toolbar.onActivityChange('writing')
    toolbar.onGazeChange('user')
    toolbar.onMotionInputChange?.('drag')
    toolbar.onMotionModeChange?.('pan')
    toolbar.onSceneStyleChange('scribble')
    toolbar.onScreenSaverDelayChange?.('1h')
    toolbar.onTimeModeChange('auto')
    toolbar.onWeatherEnabledChange(true)
    toolbar.onWeatherLocationChange(seoulLocation)
    toolbar.onWeatherSceneModeChange('rain')
    expect(publish.mock.calls.map(([setting]) => setting)).toEqual([
      {name: 'activity', value: 'writing'},
      {name: 'gaze', value: 'user'},
      {name: 'motionInput', value: 'drag'},
      {name: 'motionMode', value: 'pan'},
      {name: 'sceneStyle', value: 'scribble'},
      {name: 'screenSaverDelay', value: '1h'},
      {name: 'timeMode', value: 'auto'},
      {name: 'weatherEnabled', value: true},
      {name: 'weatherLocation', value: seoulLocation},
      {name: 'weatherSceneMode', value: 'rain'},
    ])
    publish.mockClear()
    const handlers = vi.mocked(useDesktopSceneSettingsPublisher).mock.calls[0]?.[0]?.handlers
    if (!handlers) {
      throw new Error('Scene settings listener was not registered')
    }
    handlers.onActivityChange?.('reading')
    handlers.onGazeChange?.('focused')
    handlers.onMotionInputChange?.('drag')
    handlers.onMotionModeChange?.('depth')
    handlers.onSceneStyleChange?.('original')
    handlers.onScreenSaverDelayChange?.('off')
    handlers.onTimeModeChange?.('day')
    handlers.onWeatherEnabledChange?.(false)
    handlers.onWeatherLocationChange?.(seoulLocation)
    handlers.onWeatherSceneModeChange?.('auto')
    expect(publish).not.toHaveBeenCalled()
  })
})
