/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {
  type CodexActivity,
  type CodexSnapshot,
  useCodexNotifications,
  useSpeechTarget,
} from '../../features/codex'
import {SPoffoSpeechSurface} from '../SPoffoSpeechSurface'
import {useVoice} from '../../features/voice/use-voice'
import {useWidgetSpeech} from '../../features/speech/use-widget-speech'
import {subscribeSemanticInput} from '../../features/semantics/channel'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import type {VoiceStatus} from '../../features/voice/readout'

vi.mock('../../features/voice/use-voice', () => ({useVoice: vi.fn()}))
vi.mock('../../features/speech/use-widget-speech', () => ({useWidgetSpeech: vi.fn()}))

vi.mock('../../features/codex/use-codex-notifications', () => ({useCodexNotifications: vi.fn()}))
vi.mock('../../features/codex/use-speech-target', () => ({useSpeechTarget: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should retain one identifiable bubble per chat while other chats emit new events', () => {
  vi.mocked(useVoice).mockReturnValue({error: () => null, retry: vi.fn(), status: () => 'idle'})
  vi.mocked(useWidgetSpeech).mockReturnValue({
    error: () => null,
    speech: () => ({enabled: true, x: 0.9, y: 0.05}),
  })
  const first: CodexActivity = {
    notificationId: 1,
    phase: 'response',
    receivedAt: 2,
    sessionId: 'first-chat',
    text: '첫 채팅 응답',
    title: '첫 채팅',
    tool: null,
  }
  const second: CodexActivity = {
    notificationId: 1,
    phase: 'working',
    receivedAt: 3,
    sessionId: 'second-chat',
    text: '다른 채팅 작업',
    title: '다른 채팅',
    tool: 'Bash',
  }
  const [snapshot, setSnapshot] = createSignal<CodexSnapshot>({
    activity: second,
    received: true,
    recent: [],
    registered: true,
    sessions: [first, second],
  })
  vi.mocked(useCodexNotifications).mockReturnValue({
    available: true,
    busy: () => false,
    configureQuestions: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    dismiss: undefined,
    error: () => null,
    loading: () => false,
    refresh: vi.fn(),
    snapshot,
  })
  vi.mocked(useSpeechTarget).mockReturnValue(() => undefined)
  render(() => <SPoffoSpeechSurface />)
  const bubbles = screen.getAllByRole('status').toReversed()
  expect(bubbles).toHaveLength(2)
  expect(bubbles[0]).toHaveTextContent('첫 채팅')
  expect(bubbles[0]).toHaveTextContent('첫 채팅 응답')
  expect(bubbles[1]).toHaveTextContent('다른 채팅')
  setSnapshot((value) => ({
    ...value,
    sessions: [first, {...second, phase: 'approval', text: '승인 대기'}],
  }))
  expect(screen.getAllByRole('status').at(-1)).toBe(bubbles[0])
  expect(bubbles[0]).toHaveTextContent('첫 채팅 응답')
  expect(bubbles[1]).toHaveTextContent('승인 대기')
  setSnapshot((value) => ({...value, registered: false}))
  expect(screen.queryAllByRole('status')).toHaveLength(0)
})

it('should release expressions after narration, resume on replay and retain text-only use', async () => {
  const [status, setStatus] = createSignal<VoiceStatus>('playing')
  const [enabled, setEnabled] = createSignal(true)
  vi.mocked(useVoice).mockReturnValue({error: () => null, retry: vi.fn(), status})
  vi.mocked(useWidgetSpeech).mockReturnValue({
    error: () => null,
    speech: () => ({
      enabled: true,
      voice: {...DEFAULT_POFFO_VOICE, enabled: enabled()},
      x: 0.9,
      y: 0.05,
    }),
  })
  const activity: CodexActivity = {
    notificationId: 1,
    phase: 'response',
    receivedAt: 1,
    sessionId: 'happy-chat',
    text: '잘됐어요, 축하해요!',
    title: '기쁨',
    tool: null,
  }
  vi.mocked(useCodexNotifications).mockReturnValue({
    available: true,
    busy: () => false,
    configureQuestions: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    dismiss: undefined,
    error: () => null,
    loading: () => false,
    refresh: vi.fn(),
    snapshot: () => ({
      activity,
      received: true,
      recent: [],
      registered: true,
      sessions: [activity],
    }),
  })
  vi.mocked(useSpeechTarget).mockReturnValue(() => undefined)
  const inputs: string[] = []
  const stop = await subscribeSemanticInput((input) => inputs.push(input.text))
  try {
    render(() => <SPoffoSpeechSurface widgetId="voice-widget" />)
    await Promise.resolve()
    expect(inputs.at(-1)).toBe(activity.text)
    setStatus('buffering')
    expect(inputs.at(-1)).toBe(activity.text)
    setStatus('idle')
    expect(inputs.at(-1)).toBe('')
    setStatus('playing')
    expect(inputs.at(-1)).toBe(activity.text)
    setStatus('idle')
    setEnabled(false)
    expect(inputs.at(-1)).toBe(activity.text)
  } finally {
    stop()
  }
})
