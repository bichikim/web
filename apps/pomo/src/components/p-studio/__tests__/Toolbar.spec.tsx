/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {WeatherLocation} from '../../../features/weather'
import {getPomoIconClass} from '../../icon-style'
import {PWeatherStatus} from '../../PWeatherStatus'
import {PScribbleCircleControl} from '../../scribble/CircleControl'
import {MemoryAssistPanel} from '../MemoryAssistPanel'
import {SceneSettingsPanel} from '../SettingsPanel'
import {SceneToolbar} from '../Toolbar'
import {VersionNoticePanel} from '../VersionNoticePanel'

vi.mock('../../icon-style', () => ({getPomoIconClass: vi.fn()}))
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
vi.mock('../MemoryAssistPanel', () => ({MemoryAssistPanel: vi.fn()}))
vi.mock('../VersionNoticePanel', () => ({VersionNoticePanel: vi.fn()}))

const callbacks = {
  onActivityChange: vi.fn(),
  onDialogueComposerVisibleChange: vi.fn(),
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
  dialogueComposerVisible: false,
  gaze: 'focused',
  isSceneTransitioning: false,
  motionInput: 'drag',
  motionMode: 'pan',
  onTourOpen: vi.fn(),
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
  vi.mocked(SceneSettingsPanel).mockImplementation((props) => {
    Object.values(props)
    return <div>settings control</div>
  })
  vi.mocked(MemoryAssistPanel).mockImplementation((props) => {
    Object.values(props)
    return <div>memory assist control</div>
  })
  vi.mocked(VersionNoticePanel).mockImplementation((props) => {
    Object.values(props)
    return <div>version notice control</div>
  })
  vi.mocked(PWeatherStatus).mockImplementation((props) => {
    Object.values(props)
    return null
  })
})

describe('SceneToolbar', () => {
  it('should replace the direct activity selector with the tour action', () => {
    render(() => <SceneToolbar {...baseProps} />)

    screen.getByRole('button', {name: '둘러보기'}).click()
    expect(baseProps.onTourOpen).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', {name: '둘러보기'}).parentElement).toHaveAttribute(
      'data-tour-step',
      'tour',
    )
    expect(
      vi
        .mocked(PScribbleCircleControl)
        .mock.calls.some(([props]) => props.class?.includes('max-lg:hidden')),
    ).toBe(false)
    expect(getPomoIconClass).toHaveBeenCalledWith('i-tabler-route', 'original')
    expect(SceneSettingsPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: 'reading',
        dialogueComposerVisible: false,
        gaze: 'focused',
        motionInput: 'drag',
        sceneStyle: 'original',
        timeMode: 'auto',
        weatherLocation: seoulLocation,
        weatherSceneMode: 'auto',
      }),
    )
    expect(screen.getByText('memory assist control')).toBeInTheDocument()
    expect(screen.getByText('version notice control')).toBeInTheDocument()
    expect(
      screen.getByText('memory assist control').closest('[data-tour-step="memory-assist"]'),
    ).toHaveClass('inline-flex')
    expect(MemoryAssistPanel).toHaveBeenCalledWith(
      expect.objectContaining({sceneStyle: 'original', weatherState: {status: 'disabled'}}),
    )
    const settings = screen.getByText('settings control')
    const notice = screen.getByText('version notice control')
    expect(screen.getByText('memory assist control').compareDocumentPosition(settings)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(settings.compareDocumentPosition(notice)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
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
    expect(MemoryAssistPanel).toHaveBeenCalledWith(
      expect.objectContaining({sceneStyle: 'scribble'}),
    )
    expect(getPomoIconClass).toHaveBeenCalledWith(expect.any(String), 'scribble')
    expect(onDesktopModeChange).toHaveBeenCalledWith('widget')
  })

  it('should use flow layout inside a transparent desktop surface', () => {
    const view = render(() => <SceneToolbar {...baseProps} layout="surface" />)

    expect(view.container.firstElementChild).toHaveClass('w-full')
    expect(view.container.firstElementChild).not.toHaveClass('absolute')
  })
})

it('should hide optional toolbar controls while keeping settings available', () => {
  render(() => (
    <SceneToolbar {...baseProps} toolsButtonVisible={false} memoryAssistVisible={false} />
  ))
  expect(screen.queryByRole('button', {name: '도구'})).not.toBeInTheDocument()
  expect(screen.queryByText('memory assist control')).not.toBeInTheDocument()
  expect(screen.getByText('settings control')).toBeInTheDocument()
})
