/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useDesktopSettingsState} from '../../desktop-surface/use-settings-state'
import {closeDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {
  type PDisplayPreferencesController,
  usePDisplayPreferences,
} from 'src/features/focus-room-display-preferences'
import {useUiAutoHide} from 'src/features/ui-auto-hide'
import {PSettings} from '../../p-settings/PSettings'
import {DesktopSettingsDialog} from '../Settings'

vi.mock('../../desktop-surface/use-settings-state', () => ({useDesktopSettingsState: vi.fn()}))
vi.mock('../../../features/desktop-mode/dialogs', () => ({closeDesktopDialog: vi.fn()}))
vi.mock('src/features/focus-room-display-preferences', () => ({usePDisplayPreferences: vi.fn()}))
vi.mock('src/features/ui-auto-hide', () => ({useUiAutoHide: vi.fn()}))
vi.mock('../../p-settings/PSettings', () => ({PSettings: vi.fn()}))

const seoulLocation = {
  country: '대한민국',
  id: 'openweather:legacy:seoul',
  legacyCitySlug: 'seoul',
  name: '서울',
  region: '서울특별시',
} as const

const displayPreferences = {
  dialogueComposerVisible: () => true,
  featureRequestVisible: () => true,
  isReady: () => true,
  memoryAssistVisible: () => true,
  onDialogueComposerVisibleChange: vi.fn(),
  onFeatureRequestVisibleChange: vi.fn(),
  onMemoryAssistVisibleChange: vi.fn(),
  onPlayerVisibleChange: vi.fn(),
  onPomodoroVisibleChange: vi.fn(),
  onToolsButtonVisibleChange: vi.fn(),
  onTourButtonVisibleChange: vi.fn(),
  playerVisible: () => true,
  pomodoroVisible: () => true,
  toolsButtonVisible: () => true,
  tourButtonVisible: () => true,
} satisfies PDisplayPreferencesController

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(closeDesktopDialog).mockResolvedValue(undefined)
  vi.mocked(usePDisplayPreferences).mockReturnValue(displayPreferences)
  vi.mocked(useUiAutoHide).mockReturnValue({
    enabled: () => true,
    hidden: () => false,
    onEnabledChange: vi.fn(),
    onSecondsChange: vi.fn(),
    seconds: () => 60,
  })
  vi.mocked(useDesktopSettingsState).mockReturnValue({
    activity: () => 'reading',
    background: {} as ReturnType<typeof useDesktopSettingsState>['background'],
    canUseGyroscope: () => true,
    desktopMode: {mode: () => 'interactiveDesktop'} as ReturnType<
      typeof useDesktopSettingsState
    >['desktopMode'],
    gaze: () => 'focused',
    motionInput: () => 'drag',
    motionMode: () => 'depth',
    onActivityChange: vi.fn(),
    onGazeChange: vi.fn(),
    onMotionInputChange: vi.fn(),
    onMotionModeChange: vi.fn(),
    onSceneStyleChange: vi.fn(),
    onScreenSaverDelayChange: vi.fn(),
    onTimeModeChange: vi.fn(),
    onWeatherEnabledChange: vi.fn(),
    onWeatherLocationChange: vi.fn(),
    onWeatherSceneModeChange: vi.fn(),
    sceneStyle: () => 'original',
    screenSaverDelay: () => '10m',
    timeMode: () => 'day',
    weather: {
      enabled: () => true,
      location: () => seoulLocation,
      sceneMode: () => 'auto',
      state: () => ({status: 'disabled'}),
    },
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should pass desktop settings state to the window presentation', () => {
  render(() => <DesktopSettingsDialog />)

  const props = vi.mocked(PSettings).mock.calls[0]?.[0]
  if (props === undefined) {
    throw new Error('Missing settings props')
  }

  expect(props).toMatchObject({
    activity: 'reading',
    gaze: 'focused',
    motionInput: 'drag',
    motionMode: 'depth',
    playerVisible: true,
    pomodoroVisible: true,
    presentation: 'window',
    sceneStyle: 'original',
    screenSaverDelay: '10m',
    timeMode: 'day',
    toolsButtonVisible: true,
    tourButtonVisible: true,
    weatherEnabled: true,
    weatherLocation: seoulLocation,
    weatherSceneMode: 'auto',
  })

  props.onRequestClose?.()

  expect(closeDesktopDialog).toHaveBeenCalledExactlyOnceWith('settings')
})
