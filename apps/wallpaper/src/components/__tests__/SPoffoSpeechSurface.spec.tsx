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

vi.mock('../../features/codex/use-codex-notifications', () => ({useCodexNotifications: vi.fn()}))
vi.mock('../../features/codex/use-speech-target', () => ({useSpeechTarget: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should retain one identifiable bubble per chat while other chats emit new events', () => {
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
