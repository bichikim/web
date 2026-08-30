/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {getPomoIconClass} from '../../icon-style'
import {PSelect} from '../../PSelect'
import {PWeatherStatus} from '../../PWeatherStatus'
import {PScribbleCircleControl} from '../../scribble/CircleControl'
import {LearningPanel} from '../LearningPanel'
import {SceneSettingsPanel} from '../SettingsPanel'
import {SceneToolbar} from '../Toolbar'
import type {WeatherLocation} from '../../../features/weather'

vi.mock('../../icon-style', () => ({getPomoIconClass: vi.fn()}))
vi.mock('../../PSelect', () => ({PSelect: vi.fn()}))
vi.mock('../../PWeatherStatus', () => ({PWeatherStatus: vi.fn()}))
vi.mock('../../PDesktopModeControl', () => ({
  PDesktopModeControl: (props: {
    readonly mode: string
    readonly onModeChange: (mode: 'widget') => Promise<void>
  }) => {
    Object.values(props)
    void props.onModeChange('widget')
    return null
  },
}))
vi.mock('../../scribble/CircleControl', () => ({PScribbleCircleControl: vi.fn()}))
vi.mock('../../PModelDownloadStatus', () => ({PModelDownloadStatus: () => null}))
vi.mock('../SettingsPanel', () => ({SceneSettingsPanel: vi.fn()}))
vi.mock('../LearningPanel', () => ({LearningPanel: vi.fn()}))

const callbacks = {
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
}

const seoulLocation = {
  country: '대한민국',
  id: 'openweather:legacy:seoul',
  legacyCitySlug: 'seoul',
  name: '서울',
  region: '서울특별시',
} as const satisfies WeatherLocation

const baseProps = {
  activity: 'reading',
  canUseGyroscope: true,
  gaze: 'focused',
  isSceneTransitioning: false,
  motionInput: 'drag',
  motionMode: 'pan',
  sceneStyle: 'original',
  screenSaverDelay: '5s',
  timeMode: 'auto',
  weatherEnabled: true,
  weatherLocation: seoulLocation,
  weatherSceneMode: 'auto',
  weatherState: {status: 'disabled'},
  ...callbacks,
} as const

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getPomoIconClass).mockImplementation((icon) => `icon:${icon}`)
  vi.mocked(PScribbleCircleControl).mockImplementation((props) => {
    Object.values(props)
    return <div>{props.children}</div>
  })
  vi.mocked(PSelect).mockImplementation((props) => {
    Object.values(props)
    props.getIconClass?.('i-tabler-test')
    return null
  })
  vi.mocked(SceneSettingsPanel).mockImplementation((props) => {
    Object.values(props)
    return <div>{props.fallback}</div>
  })
  vi.mocked(LearningPanel).mockImplementation((props) => {
    Object.values(props)
    return <div>learning control</div>
  })
  vi.mocked(PWeatherStatus).mockImplementation((props) => {
    Object.values(props)
    return null
  })
})

describe('SceneToolbar', () => {
  it('should keep only activity as a direct scene selector and forward all settings properties', () => {
    render(() => <SceneToolbar {...baseProps} />)

    expect(PSelect).toHaveBeenCalledWith(expect.objectContaining({label: '행동', value: 'reading'}))
    expect(vi.mocked(PSelect).mock.calls.every(([props]) => props.label === '행동')).toBe(true)
    expect(SceneSettingsPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: 'reading',
        gaze: 'focused',
        motionInput: 'drag',
        sceneStyle: 'original',
        timeMode: 'auto',
        weatherLocation: seoulLocation,
        weatherSceneMode: 'auto',
      }),
    )
    expect(screen.getByText('learning control')).toBeInTheDocument()
    expect(LearningPanel).toHaveBeenCalledWith(expect.objectContaining({sceneStyle: 'original'}))
    expect(vi.mocked(PSelect).mock.invocationCallOrder.at(-1)).toBeLessThan(
      vi.mocked(LearningPanel).mock.invocationCallOrder[0],
    )
    expect(vi.mocked(LearningPanel).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(SceneSettingsPanel).mock.invocationCallOrder[0],
    )
    expect(PWeatherStatus).toHaveBeenCalledWith(
      expect.objectContaining({sceneStyle: 'original', state: {status: 'disabled'}}),
    )
  })

  it('should render the transition status for scribble scenes', () => {
    const onDesktopModeChange = vi.fn().mockResolvedValue(undefined)
    render(() => (
      <SceneToolbar
        {...baseProps}
        desktopMode="widget"
        desktopModeError="native failed"
        isSceneTransitioning
        isDesktopModeChanging
        onDesktopModeChange={onDesktopModeChange}
        sceneStyle="scribble"
        timeMode="night"
      />
    ))

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(getPomoIconClass).toHaveBeenCalledWith('i-tabler-brain', 'scribble')
    expect(getPomoIconClass).toHaveBeenCalledWith(expect.any(String), 'scribble')
    expect(onDesktopModeChange).toHaveBeenCalledWith('widget')
  })

  it('should use flow layout inside a transparent desktop surface', () => {
    const view = render(() => <SceneToolbar {...baseProps} layout="surface" />)

    expect(view.container.firstElementChild).toHaveClass('w-full')
    expect(view.container.firstElementChild).not.toHaveClass('absolute')
  })
})
