/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import type {PTrack} from '../../../features/focus-room-audio'
import type {PSayController} from '../../../features/pomo-webmcp'
import {
  RANDOM_DIALOGUE_EVENT,
  usePEvents,
  useRandomEvent,
} from '../../../features/focus-room-dialogue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {PStudioEvents} from '../Events'

vi.mock('../../../features/focus-room-dialogue', () => ({
  RANDOM_DIALOGUE_EVENT: 'random-event',
  usePEvents: vi.fn(),
  useRandomEvent: vi.fn(),
}))
vi.mock('../../PDialoguePlayer', () => ({
  PDialoguePlayer: (props: {
    readonly externalText: string | null
    readonly onStopExternalSpeech: () => void
    readonly sceneStyle: string
  }) => (
    <div data-dialogue-scene={props.sceneStyle} data-external-text={props.externalText ?? ''}>
      <button onClick={props.onStopExternalSpeech} type="button">
        외부 발화 중지
      </button>
    </div>
  ),
}))
vi.mock('../../PFeedStatus', () => ({
  PFeedStatus: (props: {readonly sceneStyle: string}) => <div data-feed-scene={props.sceneStyle} />,
}))
vi.mock('../../PMusicPlayer', () => ({
  PMusicPlayer: (props: {
    readonly expanded: boolean
    readonly onExpandedChange: (expanded: boolean) => void
    readonly onPlayingChange: (playing: boolean) => void
    readonly onTrackChange: (track: PTrack | null) => void
    readonly sceneStyle: string
  }) => (
    <div data-expanded={props.expanded} data-music-scene={props.sceneStyle}>
      <button onClick={() => props.onPlayingChange(true)} type="button">
        음악 재생
      </button>
      <button onClick={() => props.onExpandedChange(true)} type="button">
        플레이어 펼치기
      </button>
      <button onClick={() => props.onTrackChange(null)} type="button">
        트랙 지우기
      </button>
    </div>
  ),
}))
vi.mock('../../PPomodoro', () => ({
  PPomodoro: (props: {
    readonly onEvents: (eventIds: ReadonlyArray<string>) => void
    readonly onPresentationChange: (presentation: {
      readonly phaseLabel: string
      readonly statusLabel: string
      readonly timeLabel: string
    }) => void
    readonly sceneStyle: string
  }) => (
    <div data-pomodoro-scene={props.sceneStyle}>
      <button onClick={() => props.onEvents(['focus-start'])} type="button">
        집중 시작 이벤트
      </button>
      <button
        onClick={() =>
          props.onPresentationChange({
            phaseLabel: '집중',
            statusLabel: '진행 중',
            timeLabel: '25:00',
          })
        }
        type="button"
      >
        타이머 표시 갱신
      </button>
    </div>
  ),
}))

const createEvents = (
  overrides: {
    readonly activeText?: string | null
    readonly blocked?: boolean
    readonly scheduledCount?: number
    readonly playDialogueEvents?: ReturnType<typeof vi.fn>
  } = {},
) =>
  ({
    activeText: () => overrides.activeText ?? null,
    isDialoguePlaybackBlocked: () => overrides.blocked ?? false,
    playDialogueEvents: overrides.playDialogueEvents ?? vi.fn(async () => undefined),
    scheduledDialogueCount: () => overrides.scheduledCount ?? 0,
  }) as unknown as ReturnType<typeof usePEvents>

const createPomoSay = (speechText: string | null = null): PSayController => ({
  activeViseme: () => 'rest',
  isPlaying: () => false,
  speechText: () => speechText,
  stop: vi.fn(),
})

const renderEvents = (
  options: {
    readonly events?: ReturnType<typeof createEvents>
    readonly expanded?: boolean
    readonly pomoSay?: PSayController
    readonly onMusicPlayingChange?: (isPlaying: boolean) => void
    readonly onPlayerExpandedChange?: (isExpanded: boolean) => void
    readonly onPomodoroPresentationChange?: (presentation: {
      readonly phaseLabel: string
      readonly statusLabel: string
      readonly timeLabel: string
    }) => void
    readonly onTrackChange?: (track: PTrack | null) => void
  } = {},
) => {
  vi.mocked(usePEvents).mockReturnValue(options.events ?? createEvents())

  return render(() => (
    <PStudioEvents
      isPlayerExpanded={options.expanded ?? false}
      onMusicPlayingChange={options.onMusicPlayingChange ?? vi.fn()}
      onPlayerExpandedChange={options.onPlayerExpandedChange ?? vi.fn()}
      onPomodoroPresentationChange={options.onPomodoroPresentationChange ?? vi.fn()}
      onTrackChange={options.onTrackChange ?? vi.fn()}
      pomoSay={options.pomoSay ?? createPomoSay()}
      sceneStyle="original"
    />
  ))
}

describe('PStudioEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should forward timer, music, player, and external-speech interactions', async () => {
    const events = createEvents()
    const pomoSay = createPomoSay()
    const onMusicPlayingChange = vi.fn()
    const onPlayerExpandedChange = vi.fn()
    const onPomodoroPresentationChange = vi.fn()
    const onTrackChange = vi.fn()

    const {container} = renderEvents({
      events,
      onMusicPlayingChange,
      onPlayerExpandedChange,
      onPomodoroPresentationChange,
      onTrackChange,
      pomoSay,
    })

    expect(container.querySelector('[data-dialogue-active]')).toBeNull()
    expect(container.querySelector('[data-player-expanded]')).toBeNull()
    expect(container.querySelector('[data-pomodoro-scene]')).toHaveAttribute(
      'data-pomodoro-scene',
      'original',
    )
    expect(container.querySelector('[data-music-scene]')).toHaveAttribute(
      'data-music-scene',
      'original',
    )
    expect(container.querySelector('[data-feed-scene]')).toHaveAttribute(
      'data-feed-scene',
      'original',
    )

    fireEvent.click(screen.getByRole('button', {name: '집중 시작 이벤트'}))
    fireEvent.click(screen.getByRole('button', {name: '타이머 표시 갱신'}))
    fireEvent.click(screen.getByRole('button', {name: '음악 재생'}))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.click(screen.getByRole('button', {name: '트랙 지우기'}))
    fireEvent.click(screen.getByRole('button', {name: '외부 발화 중지'}))
    await Promise.resolve()

    expect(events.playDialogueEvents).toHaveBeenCalledWith(['focus-start'], pomoSay.stop)
    expect(onPomodoroPresentationChange).toHaveBeenCalledWith({
      phaseLabel: '집중',
      statusLabel: '진행 중',
      timeLabel: '25:00',
    })
    expect(onMusicPlayingChange).toHaveBeenCalledWith(true)
    expect(onPlayerExpandedChange).toHaveBeenCalledWith(true)
    expect(onTrackChange).toHaveBeenCalledWith(null)
    expect(pomoSay.stop).toHaveBeenCalledOnce()
  })

  it('should mark every active dialogue state and report failed random playback', async () => {
    const failure = new Error('playback failed')
    const events = createEvents({
      activeText: '대사가 재생 중입니다',
      blocked: true,
      playDialogueEvents: vi.fn().mockRejectedValue(failure),
      scheduledCount: 1,
    })
    const pomoSay = createPomoSay('외부 음성')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const {container} = renderEvents({events, expanded: true, pomoSay})

    expect(container.querySelector('[data-dialogue-active]')).toHaveAttribute(
      'data-dialogue-active',
      '',
    )
    expect(container.querySelector('[data-player-expanded]')).toHaveAttribute(
      'data-player-expanded',
      '',
    )
    expect(container.querySelector('[data-external-text]')).toHaveAttribute(
      'data-external-text',
      '외부 음성',
    )

    const randomEvent = vi.mocked(useRandomEvent).mock.calls[0]?.[0]
    randomEvent?.onEvent()
    await Promise.resolve()
    await Promise.resolve()

    expect(events.playDialogueEvents).toHaveBeenCalledWith([RANDOM_DIALOGUE_EVENT], pomoSay.stop)
    expect(consoleError).toHaveBeenCalledWith(
      'Unexpected pomodoro dialogue playback failure.',
      failure,
    )
  })

  it('should compact only after scheduled dialogue becomes visible', () => {
    const [activeText, setActiveText] = createSignal<string | null>(null)
    const [scheduledCount, setScheduledCount] = createSignal(1)
    const events = {
      ...createEvents(),
      activeText,
      scheduledDialogueCount: scheduledCount,
    } as ReturnType<typeof createEvents>
    const {container} = renderEvents({events})

    expect(container.querySelector('[data-dialogue-active]')).toBeNull()

    setActiveText('대사가 보입니다')
    expect(container.querySelector('[data-dialogue-active]')).toHaveAttribute(
      'data-dialogue-active',
      '',
    )

    setActiveText(null)
    expect(container.querySelector('[data-dialogue-active]')).toHaveAttribute(
      'data-dialogue-active',
      '',
    )

    setScheduledCount(0)
    expect(container.querySelector('[data-dialogue-active]')).toBeNull()
  })
})
