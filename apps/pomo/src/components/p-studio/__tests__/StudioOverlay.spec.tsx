/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render} from '@solidjs/testing-library'
import {type ComponentProps, createSignal} from 'solid-js'
import {StudioOverlay} from '../StudioOverlay'
import {PScreenSaver} from '../../PScreenSaver'

vi.mock('../../PScreenSaver', () => ({PScreenSaver: vi.fn()}))
vi.mock('../Tour', () => ({PStudioTour: vi.fn()}))
vi.mock('../TourHint', () => ({PStudioTourHint: vi.fn()}))

const createOptions = (): ComponentProps<typeof StudioOverlay> => ({
  desktopMode: 'normal',
  displayPreferences: {
    dialogueComposerVisible: () => false,
    isReady: () => true,
    memoryAssistVisible: () => true,
    onDialogueComposerVisibleChange: vi.fn(),
    onMemoryAssistVisibleChange: vi.fn(),
    onPlayerVisibleChange: vi.fn(),
    onPomodoroVisibleChange: vi.fn(),
    onToolsButtonVisibleChange: vi.fn(),
    onTourButtonVisibleChange: vi.fn(),
    playerVisible: () => true,
    pomodoroVisible: () => true,
    toolsButtonVisible: () => true,
    tourButtonVisible: () => true,
  },
  entryVisible: false,
  hasEntered: true,
  isTourHintVisible: false,
  onDismissTourHint: vi.fn(),
  screenSaver: {
    currentTrack: () => null,
    delay: () => '5s',
    isActive: () => true,
    isMusicPlaying: () => false,
    onDelayChange: vi.fn(),
    onDismiss: vi.fn(),
    onMusicPlayingChange: vi.fn(),
    onPomodoroPresentationChange: vi.fn(),
    onTrackChange: vi.fn(),
    timer: () => ({status: 'Focus', time: '25:00'}),
  },
  tour: {
    getStepElement: () => null,
    isOpen: () => false,
    onEvent: vi.fn(),
    setIsOpen: vi.fn(),
    setStudioElement: vi.fn(),
    steps: () => [],
  },
  tourButtonVisible: true,
})

beforeEach(() => vi.clearAllMocks())

describe('StudioOverlay', () => {
  it('should suppress the screen saver while UI auto hide is enabled', () => {
    const options = createOptions()
    const [enabled, setEnabled] = createSignal(false)
    render(() => <StudioOverlay {...options} uiAutoHideEnabled={enabled()} />)
    const props = vi.mocked(PScreenSaver).mock.calls[0][0]
    expect(props.isActive).toBe(true)
    setEnabled(true)
    expect(props.isActive).toBe(false)
    setEnabled(false)
    expect(props.isActive).toBe(true)
  })

  it.each([false, true])(
    'should withhold screen saver content until display preferences restore with visibility %s',
    (visible) => {
      const [isReady, setIsReady] = createSignal(false)
      const [playerVisible, setPlayerVisible] = createSignal(true)
      const [pomodoroVisible, setPomodoroVisible] = createSignal(true)
      const options = createOptions()
      const displayPreferences = {
        ...options.displayPreferences,
        isReady,
        playerVisible,
        pomodoroVisible,
      }
      const track = {
        artist: 'Artist',
        durationSeconds: 60,
        id: 'track',
        source: '/track.mp3',
        title: 'Track',
      }
      const timer = {status: 'Focus', time: '24:59'}
      const screenSaver = {
        ...options.screenSaver,
        currentTrack: () => track,
        isMusicPlaying: () => true,
        timer: () => timer,
      }
      render(() => (
        <StudioOverlay
          {...options}
          displayPreferences={displayPreferences}
          screenSaver={screenSaver}
        />
      ))
      const props = vi.mocked(PScreenSaver).mock.calls[0][0]
      expect(props.isActive).toBe(true)
      expect(props.isMusicPlaying).toBe(false)
      expect(props.track).toBeNull()
      expect(props.timer).toBeUndefined()

      setPlayerVisible(visible)
      setPomodoroVisible(visible)
      setIsReady(true)
      expect(props.isActive).toBe(true)
      expect(props.isMusicPlaying).toBe(visible)
      expect(props.track).toBe(visible ? track : null)
      expect(props.timer).toBe(visible ? timer : undefined)

      setPlayerVisible(true)
      setPomodoroVisible(false)
      expect(props.isMusicPlaying).toBe(true)
      expect(props.track).toBe(track)
      expect(props.timer).toBeUndefined()
      setPlayerVisible(false)
      setPomodoroVisible(true)
      expect(props.isMusicPlaying).toBe(false)
      expect(props.track).toBeNull()
      expect(props.timer).toBe(timer)
    },
  )
})
