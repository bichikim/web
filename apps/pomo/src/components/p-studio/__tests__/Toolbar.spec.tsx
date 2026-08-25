/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {getPomoIconClass} from '../../icon-style'
import {PIconButton} from '../../PIconButton'
import {PSelect} from '../../PSelect'
import {PWeatherStatus} from '../../PWeatherStatus'
import {PScribbleCircleControl} from '../../scribble/CircleControl'
import {getNextTimeMode} from '../../../features/focus-room-time'
import {SceneSettingsPanel} from '../SettingsPanel'
import {SceneToolbar} from '../Toolbar'

vi.mock('../../icon-style', () => ({getPomoIconClass: vi.fn()}))
vi.mock('../../PIconButton', () => ({PIconButton: vi.fn()}))
vi.mock('../../PSelect', () => ({PSelect: vi.fn()}))
vi.mock('../../PWeatherStatus', () => ({PWeatherStatus: vi.fn()}))
vi.mock('../../scribble/CircleControl', () => ({PScribbleCircleControl: vi.fn()}))
vi.mock('../../../features/focus-room-time', () => ({getNextTimeMode: vi.fn()}))
vi.mock('../SettingsPanel', () => ({SceneSettingsPanel: vi.fn()}))

const callbacks = {
  onActivityChange: vi.fn(),
  onGazeChange: vi.fn(),
  onMotionInputChange: vi.fn(),
  onMotionModeChange: vi.fn(),
  onSceneStyleChange: vi.fn(),
  onScreenSaverDelayChange: vi.fn(),
  onTimeModeChange: vi.fn(),
  onWeatherCityChange: vi.fn(),
  onWeatherEnabledChange: vi.fn(),
}

const baseProps = {
  activity: 'reading',
  canUseGyroscope: true,
  gaze: 'focused',
  isSceneTransitioning: false,
  motionInput: 'drag',
  motionMode: 'pan',
  sceneStyle: 'original',
  screenSaverDelay: '5s',
  time: 'day',
  timeMode: 'auto',
  weatherCitySlug: 'seoul',
  weatherEnabled: true,
  weatherState: {status: 'disabled'},
  ...callbacks,
} as const

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getPomoIconClass).mockImplementation((icon) => `icon:${icon}`)
  vi.mocked(getNextTimeMode).mockReturnValue('day')
  vi.mocked(PScribbleCircleControl).mockImplementation((props) => {
    Object.values(props)
    return <div>{props.children}</div>
  })
  vi.mocked(PIconButton).mockImplementation((props) => {
    Object.values(props)
    return (
      <button onClick={(event) => props.onPress(event.currentTarget)} type="button">
        {props.accessibleLabel}
      </button>
    )
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
  vi.mocked(PWeatherStatus).mockImplementation((props) => {
    Object.values(props)
    return null
  })
})

describe('SceneToolbar', () => {
  it('should expose automatic time and forward all toolbar properties', () => {
    render(() => <SceneToolbar {...baseProps} />)

    const timeButton = screen.getByRole('button')
    expect(timeButton).toHaveAccessibleName(expect.stringContaining('낮'))
    fireEvent.click(timeButton)
    expect(getNextTimeMode).toHaveBeenCalledWith('auto')
    expect(callbacks.onTimeModeChange).toHaveBeenCalledWith('day')
    expect(PSelect).toHaveBeenCalled()
    expect(SceneSettingsPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: 'reading',
        motionInput: 'drag',
        sceneStyle: 'original',
        weatherCitySlug: 'seoul',
      }),
    )
    expect(PWeatherStatus).toHaveBeenCalledWith(
      expect.objectContaining({sceneStyle: 'original', state: {status: 'disabled'}}),
    )
  })

  it('should render selected time and the transition status for scribble scenes', () => {
    render(() => (
      <SceneToolbar
        {...baseProps}
        isSceneTransitioning
        sceneStyle="scribble"
        time="night"
        timeMode="night"
      />
    ))

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAccessibleName(expect.stringContaining('밤'))
    expect(getPomoIconClass).toHaveBeenCalledWith(expect.any(String), 'scribble')
  })

  it('should fall back to the first time option for an unexpected mode', () => {
    render(() => (
      <SceneToolbar
        {...baseProps}
        timeMode={'unexpected' as unknown as typeof baseProps.timeMode}
      />
    ))

    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
