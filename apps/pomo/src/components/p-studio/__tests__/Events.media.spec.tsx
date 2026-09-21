/** @vitest-environment jsdom */
import {
  createEvents,
  createPomoSay,
  musicPlaybackMocks,
  musicPlayerLifecycleMocks,
  oneOffChatMocks,
  renderEvents,
  soundEffectsMocks,
} from './fixtures/events'

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {usePEvents} from '../../../features/focus-room-dialogue'
import {useOptionalSoundEffects} from '../../../features/sound-effects'

import {useMemoryReminders} from '../../../features/memory-assist'

import {PStudioEvents} from '../Events'
import {useChildPresence} from '../use-child-presence'
import {useMobileLayout} from '../use-mobile-layout'
import {useOneOffChat} from '../use-one-off-chat'

describe('PStudioEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMemoryReminders).mockReturnValue({skippedReminders: () => []})
    vi.mocked(useChildPresence).mockReturnValue(() => false)
    vi.mocked(useMobileLayout).mockReturnValue(() => false)
    vi.mocked(useOptionalSoundEffects).mockReturnValue(undefined)
    oneOffChatMocks.downloadConsentOpen.mockReturnValue(false)
    oneOffChatMocks.draft.mockReturnValue('')
    oneOffChatMocks.errorMessage.mockReturnValue(null)
    oneOffChatMocks.isBusy.mockReturnValue(false)
    musicPlaybackMocks.pause.mockReset()
    musicPlaybackMocks.play.mockReset()
    musicPlayerLifecycleMocks.actionsReady = true
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should register music controls for event actions', () => {
    const runAction = vi.fn()
    const unregister = vi.fn()
    const registerEventActionExecutor = vi.fn(
      (executor: (actionId: 'music-start' | 'music-stop') => void) => {
        runAction.mockImplementation(executor)
        return unregister
      },
    )
    const events = createEvents({registerEventActionExecutor})

    const result = renderEvents({events})
    runAction('music-stop')
    runAction('music-start')

    expect(registerEventActionExecutor).toHaveBeenCalledOnce()
    result.unmount()
    expect(unregister).toHaveBeenCalledOnce()
  })

  it('should register sound-effect controls for event actions', () => {
    vi.mocked(useOptionalSoundEffects).mockReturnValue({
      activate: soundEffectsMocks.activate,
      effects: () => [],
      getPlayback: () => undefined,
      isStopped: () => false,
      status: () => 'ready',
      stop: soundEffectsMocks.stop,
    })
    const runAction = vi.fn()
    const registerEventActionExecutor = vi.fn(
      (executor: (actionId: 'sound-effects-start' | 'sound-effects-stop') => void) => {
        runAction.mockImplementation(executor)
        return vi.fn()
      },
    )
    const events = createEvents({registerEventActionExecutor})

    renderEvents({events})
    runAction('sound-effects-stop')
    runAction('sound-effects-start')

    expect(soundEffectsMocks.stop).toHaveBeenCalledOnce()
    expect(soundEffectsMocks.activate).toHaveBeenCalledOnce()
  })

  it('should not activate sound effects from events when all effects are stopped', () => {
    vi.mocked(useOptionalSoundEffects).mockReturnValue({
      activate: soundEffectsMocks.activate,
      effects: () => [],
      getPlayback: () => undefined,
      isStopped: () => true,
      status: () => 'ready',
      stop: soundEffectsMocks.stop,
    })
    const runAction = vi.fn()
    const registerEventActionExecutor = vi.fn(
      (executor: (actionId: 'sound-effects-start' | 'sound-effects-stop') => void) => {
        runAction.mockImplementation(executor)
        return vi.fn()
      },
    )
    const events = createEvents({registerEventActionExecutor})

    renderEvents({events})
    runAction('sound-effects-start')

    expect(soundEffectsMocks.activate).not.toHaveBeenCalled()
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
    const dialogueComposer = screen.getByRole('textbox', {name: '대화 입력'}).closest('form')
    const mediaControls = dialogueComposer?.parentElement
    const mediaDock = mediaControls?.parentElement
    const mediaMessages = mediaDock?.lastElementChild
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
    fireEvent.click(screen.getByRole('button', {name: '복원 이벤트'}))
    fireEvent.click(screen.getByRole('button', {name: '타이머 표시 갱신'}))
    fireEvent.click(screen.getByRole('button', {name: '음악 재생'}))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.click(screen.getByRole('button', {name: '트랙 지우기'}))
    fireEvent.click(screen.getByRole('button', {name: '외부 발화 중지'}))
    await Promise.resolve()

    expect(events.playDialogueEvents).toHaveBeenCalledWith(['focus-start'], pomoSay.stop)
    expect(events.playDialogueEvents).toHaveBeenCalledWith(['focus-end'], pomoSay.stop, {
      replacementPolicy: 'latest',
    })
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

  it('should register external speech stop for controller-owned playback', () => {
    let beforePlayback: (() => void) | undefined
    const unregister = vi.fn()
    const events = createEvents({
      registerBeforePlayback: (callback) => {
        beforePlayback = callback
        return unregister
      },
    })
    const pomoSay = createPomoSay()
    const result = renderEvents({events, pomoSay})

    beforePlayback?.()

    expect(pomoSay.stop).toHaveBeenCalledOnce()
    result.unmount()
    expect(unregister).toHaveBeenCalledOnce()
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

  it('should preserve pending music actions across player remount', () => {
    let runAction: ((actionId: 'music-start' | 'music-stop') => void) | undefined
    const registerEventActionExecutor = vi.fn(
      (executor: (actionId: 'music-start' | 'music-stop') => void) => {
        runAction = executor
        return vi.fn()
      },
    )
    const events = createEvents({registerEventActionExecutor})
    vi.mocked(usePEvents).mockReturnValue(events)
    const [playerVisible, setPlayerVisible] = createSignal(true)
    musicPlayerLifecycleMocks.actionsReady = false
    const result = render(() => (
      <PStudioEvents
        playerVisible={playerVisible()}
        dialogueComposerVisible={false}
        isPlayerExpanded={false}
        onMusicPlayingChange={vi.fn()}
        onPlayerExpandedChange={vi.fn()}
        onPomodoroPresentationChange={vi.fn()}
        onTrackChange={vi.fn()}
        pomoSay={createPomoSay()}
        sceneStyle="original"
      />
    ))

    runAction?.('music-stop')
    expect(musicPlaybackMocks.pause).not.toHaveBeenCalled()

    setPlayerVisible(false)
    musicPlayerLifecycleMocks.actionsReady = true
    setPlayerVisible(true)

    expect(musicPlaybackMocks.pause).toHaveBeenCalledOnce()
    result.unmount()
  })

  it('should discard music actions that arrive while the player is hidden', async () => {
    let runAction: ((actionId: 'music-start' | 'music-stop') => void) | undefined
    const registerEventActionExecutor = vi.fn(
      (executor: (actionId: 'music-start' | 'music-stop') => void) => {
        runAction = executor
        return vi.fn()
      },
    )
    const events = createEvents({registerEventActionExecutor})
    vi.mocked(usePEvents).mockReturnValue(events)
    const [playerVisible, setPlayerVisible] = createSignal(true)
    const result = render(() => (
      <PStudioEvents
        playerVisible={playerVisible()}
        dialogueComposerVisible={false}
        isPlayerExpanded={false}
        onMusicPlayingChange={vi.fn()}
        onPlayerExpandedChange={vi.fn()}
        onPomodoroPresentationChange={vi.fn()}
        onTrackChange={vi.fn()}
        pomoSay={createPomoSay()}
        sceneStyle="original"
      />
    ))

    runAction?.('music-start')
    expect(musicPlaybackMocks.play).toHaveBeenCalledOnce()

    setPlayerVisible(false)
    runAction?.('music-stop')
    setPlayerVisible(true)

    expect(musicPlaybackMocks.pause).not.toHaveBeenCalled()
    result.unmount()
  })
})
it('should unmount disabled widgets and mount them again independently', () => {
  vi.mocked(usePEvents).mockReturnValue(createEvents())
  const [playerVisible, setPlayerVisible] = createSignal(true)
  const [pomodoroVisible, setPomodoroVisible] = createSignal(true)
  const result = render(() => (
    <PStudioEvents
      playerVisible={playerVisible()}
      pomodoroVisible={pomodoroVisible()}
      dialogueComposerVisible={false}
      isPlayerExpanded={false}
      onMusicPlayingChange={vi.fn()}
      onPlayerExpandedChange={vi.fn()}
      onPomodoroPresentationChange={vi.fn()}
      onTrackChange={vi.fn()}
      pomoSay={createPomoSay()}
      sceneStyle="original"
    />
  ))
  const player = result.container.querySelector('[data-music-scene]')
  const timer = result.container.querySelector('[data-pomodoro-scene]')
  setPlayerVisible(false)
  expect(player?.isConnected).toBe(false)
  expect(timer?.isConnected).toBe(true)
  setPomodoroVisible(false)
  expect(timer?.isConnected).toBe(false)
  setPlayerVisible(true)
  expect(result.container.querySelector('[data-music-scene]')).not.toBe(player)
  expect(result.container.querySelector('[data-pomodoro-scene]')).toBeNull()
})
