/** @vitest-environment jsdom */
import {
  createEvents,
  createPomoSay,
  musicPlaybackMocks,
  musicPlayerLifecycleMocks,
  oneOffChatMocks,
  releaseMocks,
  renderEvents,
} from './fixtures/events'

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type EventActionId,
  RANDOM_DIALOGUE_EVENT,
  useRandomEvent,
} from '../../../features/focus-room-dialogue'
import {useOptionalSoundEffects} from '../../../features/sound-effects'
import * as m from '@paraglide/message'
import {createMemoryMemo} from '../../../features/memory-assist/schedule'
import {useMemoryReminders} from '../../../features/memory-assist'
import type {PSayController} from '../../../features/pomo-webmcp'

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
    releaseMocks.serverAiReleased = true
    musicPlayerLifecycleMocks.onPlaybackActionsReady = null
    musicPlaybackMocks.pause.mockReset()
    musicPlaybackMocks.play.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should show skipped reminder text and remove its alert after recovery', () => {
    const memo = createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    })
    const [skippedReminders, setSkippedReminders] = createSignal([memo])
    vi.mocked(useMemoryReminders).mockReturnValue({skippedReminders})
    renderEvents()
    expect(screen.getByRole('alert')).toHaveTextContent(
      m.memory_reminder_playback_skipped({text: memo.text}),
    )
    setSkippedReminders([])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('should auto-expand the composer on mobile only when dialogue messages are absent', () => {
    vi.mocked(useMobileLayout).mockReturnValue(() => true)
    const idleResult = renderEvents()

    expect(screen.getByRole('textbox', {name: '대화 입력'}).closest('form')).toHaveAttribute(
      'data-auto-expand',
      '',
    )
    idleResult.unmount()

    vi.mocked(useChildPresence).mockReturnValue(() => true)
    const activeResult = renderEvents()

    expect(screen.getByRole('textbox', {name: '대화 입력'}).closest('form')).not.toHaveAttribute(
      'data-auto-expand',
    )
    activeResult.unmount()

    vi.mocked(useMobileLayout).mockReturnValue(() => false)
    const desktopResult = renderEvents()

    expect(screen.getByRole('textbox', {name: '대화 입력'}).closest('form')).not.toHaveAttribute(
      'data-auto-expand',
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

  it('should show the one-off dialogue error to the user', () => {
    oneOffChatMocks.errorMessage.mockReturnValue('모델 준비 실패')

    renderEvents()

    expect(screen.getByRole('alert')).toHaveTextContent('모델 준비 실패')
  })

  it('should connect the one-off chat draft to the dialogue composer', () => {
    oneOffChatMocks.draft.mockReturnValue('복구된 대화')

    const {container} = renderEvents()

    expect(screen.getByRole('textbox', {name: '대화 입력'})).toHaveValue('복구된 대화')
    expect(container.querySelector('.pomo-dialogue-composer')).toHaveAttribute(
      'data-execution-mode',
      'local',
    )
    expect(container.querySelector('.pomo-dialogue-composer')).toHaveAttribute(
      'data-server-access-status',
      'unavailable',
    )
    expect(container.querySelector('.pomo-dialogue-composer')).toHaveAttribute(
      'data-server-available',
      'false',
    )

    fireEvent.input(screen.getByRole('textbox', {name: '대화 입력'}), {
      target: {value: '수정한 질문'},
    })
    expect(oneOffChatMocks.setDraft).toHaveBeenCalledWith('수정한 질문')
    const oneOffChatOptions = vi.mocked(useOneOffChat).mock.calls.at(-1)?.[0]
    expect(oneOffChatOptions?.isEnabled?.()).toBe(true)

    screen.getByRole('button', {name: '서버 모드 선택'}).click()
    expect(oneOffChatMocks.serverJob.setExecutionMode).toHaveBeenCalledWith('server')
  })

  it('should connect download consent actions to the one-off chat', () => {
    oneOffChatMocks.downloadConsentOpen.mockReturnValue(true)
    const {container} = renderEvents()

    expect(container.querySelector('[data-download-size]')).toHaveAttribute(
      'data-download-size',
      '3.7GB',
    )
    screen.getByRole('button', {name: '취소 동의'}).click()
    screen.getByRole('button', {name: '다운로드 동의'}).click()

    expect(oneOffChatMocks.cancelDownloadConsent).toHaveBeenCalledOnce()
    expect(oneOffChatMocks.startDownload).toHaveBeenCalledOnce()
  })

  it('should omit server job controls when server execution is unreleased', () => {
    releaseMocks.serverAiReleased = false
    const {container, unmount} = renderEvents()

    expect(container.querySelector('[data-ai-job-status]')).toBeNull()
    expect(screen.queryByRole('button', {name: '서버 모드 선택'})).toBeNull()
    expect(oneOffChatMocks.serverJob.setExecutionMode).not.toHaveBeenCalled()
    unmount()
  })

  it('should handle an invalid registered event action without throwing', () => {
    let runAction: ((actionId: EventActionId) => void) | undefined
    const events = createEvents({
      registerEventActionExecutor: (executor) => {
        runAction = executor
        return vi.fn()
      },
    })
    renderEvents({events})

    expect(() => runAction?.('unexpected-action' as unknown as EventActionId)).not.toThrow()
  })

  it('should report failed timer dialogue playback', async () => {
    const failure = new Error('timer dialogue failed')
    const events = createEvents({playDialogueEvents: vi.fn().mockRejectedValue(failure)})
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderEvents({events})

    screen.getByRole('button', {name: '집중 시작 이벤트'}).click()
    await vi.waitFor(() =>
      expect(report).toHaveBeenCalledWith(
        'Unexpected pomodoro dialogue playback failure.',
        failure,
      ),
    )
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

  it('should cancel a queued input reply when the composer is hidden', async () => {
    const pomoSay = createPomoSay()
    renderEvents({dialogueComposerVisible: false, pomoSay})
    const oneOffChatOptions = vi.mocked(useOneOffChat).mock.calls[0]?.[0]

    const reply = oneOffChatOptions?.onReply('숨겨진 입력기의 답변')

    await expect(reply).rejects.toMatchObject({name: 'AbortError'})
    expect(pomoSay.speak).not.toHaveBeenCalled()
  })

  it('should stop an active input reply when the composer is hidden', async () => {
    const [dialogueComposerVisible, setDialogueComposerVisible] = createSignal(true)
    let completeSpeech: () => void = () => undefined
    const speak: PSayController['speak'] = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          completeSpeech = resolve
        }),
    )
    const stop = vi.fn(() => completeSpeech())
    const pomoSay: PSayController = {...createPomoSay(), speak, stop}
    const events = createEvents()
    const result = render(() => (
      <PStudioEvents
        dialogueComposerVisible={dialogueComposerVisible()}
        isPlayerExpanded={false}
        onMusicPlayingChange={vi.fn()}
        onPlayerExpandedChange={vi.fn()}
        onPomodoroPresentationChange={vi.fn()}
        onTrackChange={vi.fn()}
        pomoSay={pomoSay}
        sceneStyle="original"
      />
    ))
    const oneOffChatOptions = vi.mocked(useOneOffChat).mock.calls[0]?.[0]
    const reply = oneOffChatOptions?.onReply('재생 중인 답변')

    await vi.waitFor(() => expect(speak).toHaveBeenCalledWith({text: '재생 중인 답변'}))
    setDialogueComposerVisible(false)

    await expect(reply).rejects.toMatchObject({name: 'AbortError'})
    expect(stop).toHaveBeenCalledOnce()
    result.unmount()
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
