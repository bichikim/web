/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import type {PTrack} from '../../../features/focus-room-audio'
import {useMemoryReminders} from '../../../features/memory-assist'
import type {PSayController} from '../../../features/pomo-webmcp'
import {
  RANDOM_DIALOGUE_EVENT,
  usePEvents,
  useRandomEvent,
} from '../../../features/focus-room-dialogue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {PStudioEvents} from '../Events'
import {useChildPresence} from '../use-child-presence'
import {useOneOffChat} from '../use-one-off-chat'
import {useMobileLayout} from '../use-mobile-layout'

const oneOffChatMocks = vi.hoisted(() => ({
  cancelDownloadConsent: vi.fn(),
  downloadConsentOpen: vi.fn(() => false),
  isBusy: vi.fn(() => false),
  startDownload: vi.fn(async () => undefined),
  submit: vi.fn(async () => undefined),
}))

vi.mock('../../../features/focus-room-dialogue', () => ({
  RANDOM_DIALOGUE_EVENT: 'random-event',
  usePEvents: vi.fn(),
  useRandomEvent: vi.fn(),
}))
vi.mock('../../../features/memory-assist', () => ({useMemoryReminders: vi.fn()}))
vi.mock('../use-one-off-chat', () => ({
  ONE_OFF_CHAT_MODEL: {downloadSize: '3.7GB'},
  useOneOffChat: vi.fn(() => oneOffChatMocks),
}))
vi.mock('../use-mobile-layout', () => ({
  useMobileLayout: vi.fn(() => false),
}))
vi.mock('../use-child-presence', () => ({
  useChildPresence: vi.fn(() => () => false),
}))
vi.mock('../../PDialogueComposer', () => ({
  PDialogueComposer: (props: {
    readonly autoExpand?: boolean
    readonly loading?: boolean
    readonly onSubmit?: (text: string) => void
  }) => (
    <form class="pomo-dialogue-composer" data-auto-expand={props.autoExpand ? '' : undefined}>
      <input aria-label="대화 입력" />
      <button disabled={props.loading} onClick={() => props.onSubmit?.('집중 방법')} type="button">
        대화 보내기
      </button>
    </form>
  ),
}))
vi.mock('../../PModelDownloadConsent', () => ({
  PModelDownloadConsent: () => null,
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
    readonly isDialogueActive: boolean
    readonly onExpandedChange: (expanded: boolean) => void
    readonly onPlayingChange: (playing: boolean) => void
    readonly onTrackChange: (track: PTrack | null) => void
    readonly sceneStyle: string
  }) => (
    <div
      data-music-dialogue-active={props.isDialogueActive}
      data-expanded={props.expanded}
      data-music-scene={props.sceneStyle}
    >
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
    readonly isPlaying?: boolean
    readonly scheduledCount?: number
    readonly playDialogueEvents?: ReturnType<typeof vi.fn>
  } = {},
) =>
  ({
    activeText: () => overrides.activeText ?? null,
    isDialoguePlaybackBlocked: () => overrides.blocked ?? false,
    isDialoguePlaying: () => overrides.isPlaying ?? false,
    playDialogueEvents: overrides.playDialogueEvents ?? vi.fn(async () => undefined),
    scheduledDialogueCount: () => overrides.scheduledCount ?? 0,
  }) as unknown as ReturnType<typeof usePEvents>

const createPomoSay = (speechText: string | null = null, isPreparing = false): PSayController => ({
  activeViseme: () => 'rest',
  isPlaying: () => false,
  isPreparing: () => isPreparing,
  speak: vi.fn(async () => undefined),
  speechText: () => speechText,
  stop: vi.fn(),
})

const renderEvents = (
  options: {
    readonly dialogueComposerVisible?: boolean
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
      dialogueComposerVisible={options.dialogueComposerVisible ?? true}
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
    vi.mocked(useChildPresence).mockReturnValue(() => false)
    vi.mocked(useMobileLayout).mockReturnValue(() => false)
    oneOffChatMocks.downloadConsentOpen.mockReturnValue(false)
    oneOffChatMocks.isBusy.mockReturnValue(false)
  })

  it('should auto-expand the composer on mobile only when dialogue messages are absent', () => {
    vi.mocked(useMobileLayout).mockReturnValue(() => true)
    const idleResult = renderEvents()

    expect(idleResult.container.querySelector('.pomo-dialogue-composer')).toHaveAttribute(
      'data-auto-expand',
      '',
    )
    idleResult.unmount()

    vi.mocked(useChildPresence).mockReturnValue(() => true)
    const activeResult = renderEvents()

    expect(activeResult.container.querySelector('.pomo-dialogue-composer')).not.toHaveAttribute(
      'data-auto-expand',
    )
    activeResult.unmount()

    vi.mocked(useMobileLayout).mockReturnValue(() => false)
    const desktopResult = renderEvents()

    expect(desktopResult.container.querySelector('.pomo-dialogue-composer')).not.toHaveAttribute(
      'data-auto-expand',
    )
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
    expect(container.querySelector('[data-music-scene]')).toHaveAttribute(
      'data-music-dialogue-active',
      'false',
    )
    expect(container.querySelector('[data-feed-scene]')).toHaveAttribute(
      'data-feed-scene',
      'original',
    )
    const dialogueComposer = container.querySelector('.pomo-dialogue-composer')
    const mediaDock = container.querySelector('.pomo-media-dock')
    const mediaControls = container.querySelector('.pomo-media-controls')
    const mediaMessages = container.querySelector('.pomo-media-messages')
    expect(mediaDock).toHaveClass('[&_.pomo-player-stage]:[flex:0_1_auto]')
    expect(mediaDock).not.toHaveClass('[&[data-player-expanded]_.pomo-player-stage]:[flex:1_1_0%]')
    expect(mediaDock).toHaveClass('[&[data-player-expanded]_.pomo-player-stage]:h-[19.875rem]')
    const constrainedMessagesClass =
      '[&:has(.pomo-media-messages:not(:empty))' +
      ':has(.pomo-dialogue-composer:not([data-expanded]))_.pomo-media-messages]' +
      ':w-[min(36rem,_calc(100%_-_4rem))]'
    expect(mediaDock).toHaveClass(
      '[&:has(.pomo-media-messages:not(:empty))_.pomo-dialogue-composer:not([data-expanded])]:absolute',
      '[&:has(.pomo-media-messages:not(:empty))_.pomo-dialogue-composer:not([data-expanded])]:bottom-0',
      '[&:has(.pomo-media-messages:not(:empty))_.pomo-dialogue-composer:not([data-expanded])]:right-0',
      constrainedMessagesClass,
    )
    expect(mediaControls).toHaveClass(
      'flex-col-reverse',
      'justify-start',
      'max-h-full',
      'min-h-0',
      '[&_.pomo-player-stage]:mr-auto',
      'sm:flex-row-reverse',
      'sm:flex-wrap-reverse',
      'sm:items-start',
    )
    expect(mediaControls).not.toHaveClass(
      'flex-row-reverse',
      'flex-wrap',
      'sm:flex-wrap',
      'sm:items-end',
      'sm:[&:has(.pomo-dialogue-composer[data-expanded])]:flex-wrap-reverse',
      '[&:has(.pomo-dialogue-composer[data-expanded])]:flex-wrap-reverse',
      'xs:[&:has(.pomo-dialogue-composer[data-expanded])]:flex-wrap-reverse',
    )
    expect(mediaControls?.children.item(0)).toBe(dialogueComposer)
    expect(mediaControls?.children.item(1)).toBe(container.querySelector('[data-music-scene]'))
    expect(mediaDock?.children.item(0)).toBe(mediaControls)
    expect(mediaDock?.children.item(1)).toBe(mediaMessages)
    expect(mediaMessages).toHaveClass('self-start', 'w-[min(36rem,_100%)]')
    expect(useMemoryReminders).toHaveBeenCalledWith({
      events,
      onBeforePlayback: expect.any(Function),
    })

    fireEvent.click(screen.getByRole('button', {name: '대화 보내기'}))
    expect(oneOffChatMocks.submit).toHaveBeenCalledWith('집중 방법')
    const oneOffChatOptions = vi.mocked(useOneOffChat).mock.calls[0]?.[0]
    await oneOffChatOptions?.onReply('천천히 시작해 봐요.')
    expect(pomoSay.speak).toHaveBeenCalledWith({text: '천천히 시작해 봐요.'})

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

  it('should stop external speech before a memory reminder starts playback', () => {
    const events = createEvents()
    const pomoSay = createPomoSay()

    renderEvents({events, pomoSay})
    const reminderProps = vi.mocked(useMemoryReminders).mock.calls[0]?.[0]
    reminderProps?.onBeforePlayback?.()

    expect(pomoSay.stop).toHaveBeenCalledOnce()
  })

  it('should lower music for either event dialogue or external speech playback', () => {
    const dialogueResult = renderEvents({events: createEvents({isPlaying: true})})

    expect(dialogueResult.container.querySelector('[data-music-scene]')).toHaveAttribute(
      'data-music-dialogue-active',
      'true',
    )
    dialogueResult.unmount()

    const pomoSay = {...createPomoSay(), isPlaying: () => true}
    const speechResult = renderEvents({pomoSay})

    expect(speechResult.container.querySelector('[data-music-scene]')).toHaveAttribute(
      'data-music-dialogue-active',
      'true',
    )
  })

  it('should disable dialogue submission while its model or reply voice is being prepared', () => {
    oneOffChatMocks.isBusy.mockReturnValue(true)
    const modelResult = renderEvents()

    expect(screen.getByRole('button', {name: '대화 보내기'})).toBeDisabled()
    modelResult.unmount()

    oneOffChatMocks.isBusy.mockReturnValue(false)
    const voiceResult = renderEvents({pomoSay: createPomoSay(null, true)})

    expect(screen.getByRole('button', {name: '대화 보내기'})).toBeDisabled()
    expect(voiceResult.container.querySelector('[data-external-text]')).toHaveAttribute(
      'data-external-text',
      '',
    )
    voiceResult.unmount()

    renderEvents({pomoSay: {...createPomoSay('재생 중인 답변'), isPlaying: () => true}})

    expect(screen.getByRole('button', {name: '대화 보내기'})).toBeEnabled()
  })

  it('should queue an input reply after the existing dialogue stack', async () => {
    const [activeText, setActiveText] = createSignal<string | null>('기존 대화')
    const [scheduledCount, setScheduledCount] = createSignal(1)
    const events = {
      ...createEvents(),
      activeText,
      isDialoguePlaying: () => activeText() !== null,
      scheduledDialogueCount: scheduledCount,
    } as ReturnType<typeof createEvents>
    const pomoSay = createPomoSay()
    renderEvents({events, pomoSay})
    const oneOffChatOptions = vi.mocked(useOneOffChat).mock.calls[0]?.[0]

    const reply = oneOffChatOptions?.onReply('스택에 추가할 답변')
    await Promise.resolve()

    expect(pomoSay.speak).not.toHaveBeenCalled()

    setActiveText(null)
    setScheduledCount(0)
    await reply

    expect(pomoSay.speak).toHaveBeenCalledWith({text: '스택에 추가할 답변'})
  })

  it('should omit the dialogue composer when its display setting is off', () => {
    const {container} = renderEvents({dialogueComposerVisible: false})

    expect(screen.queryByRole('textbox', {name: '대화 입력'})).toBeNull()
    expect(container.querySelector('[data-music-scene]')).toBeInTheDocument()
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
