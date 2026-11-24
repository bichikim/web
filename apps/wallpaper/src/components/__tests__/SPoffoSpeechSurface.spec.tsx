/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
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
import {createLocalInference} from '../../features/inference/create-local-inference'
import {CHARACTER_SPEECH_ID} from '../../features/conversation'
import type {VoiceMessage} from '../../features/voice/text'
import {useElementRect} from '../../features/speech/use-element-rect'
import {selectAgentSession} from '../../features/agent-state/native'
import {DEFAULT_POFFO_SPEECH, type PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
vi.mock('../../features/agent-state/native', () => ({
  readAgentSignals: vi.fn(),
  selectAgentSession: vi.fn(),
  subscribeAgentSignals: vi.fn(),
}))

vi.mock('../../features/inference/create-local-inference', () => ({createLocalInference: vi.fn()}))

vi.mock('../../features/voice/use-voice', () => ({useVoice: vi.fn()}))
vi.mock('../../features/speech/use-widget-speech', () => ({useWidgetSpeech: vi.fn()}))
vi.mock('../../features/speech/use-element-rect', () => ({useElementRect: vi.fn()}))

vi.mock('../../features/codex/use-codex-notifications', () => ({useCodexNotifications: vi.fn()}))
vi.mock('../../features/codex/use-speech-target', () => ({useSpeechTarget: vi.fn()}))
beforeEach(() => {
  vi.mocked(selectAgentSession).mockResolvedValue(undefined)
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run: vi.fn()})
  vi.mocked(useElementRect).mockReturnValue(() => null)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const renderVisibility = (speech: PoffoSpeech = DEFAULT_POFFO_SPEECH) => {
  const [value, setValue] = createSignal(speech)
  let message: () => VoiceMessage | null = () => null
  vi.mocked(useWidgetSpeech).mockReturnValue({error: () => null, speech: value})
  vi.mocked(useVoice).mockImplementation((props) => {
    message = props.message
    return {
      available: () => true,
      error: () => null,
      playback: () => null,
      readoutId: () => undefined,
      status: () => 'idle',
      toggle: vi.fn(),
    }
  })
  const activity: CodexActivity = {
    notificationId: 1,
    phase: 'response',
    receivedAt: 1,
    sessionId: 'visible-chat',
    text: 'Codex 응답',
    title: '작업',
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
  render(() => <SPoffoSpeechSurface widgetId="visibility-widget" />)
  return {message: () => message(), setValue}
}

it('should remove hidden Codex chats from selection and narration while keeping character chat available', () => {
  const {message, setValue} = renderVisibility()
  expect(message()?.text).toBe('Codex 응답')
  setValue((speech) => ({...speech, showCodex: false}))
  expect(screen.queryByRole('status', {name: 'Codex 작업 알림'})).toBeNull()
  expect(screen.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'})).toBeEnabled()
  expect(message()).toBeNull()
  expect(selectAgentSession).toHaveBeenLastCalledWith(null)
  setValue((speech) => ({...speech, showCharacter: false}))
  expect(screen.queryByRole('list')).toBeNull()
  expect(message()).toBeNull()
  setValue((speech) => ({...speech, showCodex: true}))
  expect(screen.getByRole('status', {name: 'Codex 작업 알림'})).toBeInTheDocument()
  expect(screen.queryByRole('textbox', {name: '캐릭터에게 보낼 메시지'})).toBeNull()
})

it('should retain the character response across display toggles without generating another answer', async () => {
  const run = vi.fn().mockResolvedValue('보관한 응답')
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
  const {message, setValue} = renderVisibility({...DEFAULT_POFFO_SPEECH, showCodex: false})
  fireEvent.input(screen.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'}), {
    target: {value: '안녕'},
  })
  fireEvent.submit(screen.getByRole('form', {name: '캐릭터 대화 전송'}))
  await Promise.resolve()
  await Promise.resolve()
  expect(message()?.text).toBe('보관한 응답')
  setValue((speech) => ({...speech, showCharacter: false}))
  expect(message()).toBeNull()
  setValue((speech) => ({...speech, showCharacter: true}))
  expect(screen.getByRole('region', {name: '캐릭터 응답'})).toHaveTextContent('보관한 응답')
  expect(run).toHaveBeenCalledOnce()
})

it('should show one independent character bubble and narrate it only when selected in front', async () => {
  const answer = Promise.withResolvers<string>()
  const run = vi.fn().mockReturnValueOnce(answer.promise).mockResolvedValueOnce('두 번째 응답')
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
  let narration: () => VoiceMessage | null = () => null
  vi.mocked(useVoice).mockImplementation((props) => {
    narration = props.message
    return {
      available: () => true,
      error: () => null,
      playback: () => null,
      readoutId: () => undefined,
      status: () => 'idle',
      toggle: vi.fn(),
    }
  })
  vi.mocked(useWidgetSpeech).mockReturnValue({
    error: () => null,
    speech: () => ({enabled: true, x: 0.9, y: 0.05}),
  })
  const codex: CodexActivity = {
    notificationId: 1,
    phase: 'response',
    receivedAt: 1,
    sessionId: 'work',
    text: 'Codex 응답',
    title: '작업',
    tool: null,
  }
  const [snapshot, setSnapshot] = createSignal<CodexSnapshot>({
    activity: codex,
    received: true,
    recent: [],
    registered: true,
    sessions: [codex],
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
  render(() => <SPoffoSpeechSurface widgetId="one" />)
  fireEvent.pointerEnter(screen.getByRole('list', {name: '대화 말풍선'}))
  expect(narration()?.text).toBe('Codex 응답')
  expect(selectAgentSession).toHaveBeenLastCalledWith('work')
  fireEvent.click(screen.getByRole('button', {name: '캐릭터 대화 선택'}))
  expect(selectAgentSession).toHaveBeenLastCalledWith(null)
  fireEvent.input(screen.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'}), {
    target: {value: '안녕'},
  })
  fireEvent.submit(screen.getByRole('form', {name: '캐릭터 대화 전송'}))
  fireEvent.click(screen.getByRole('button', {name: '채팅 작업 선택'}))
  expect(selectAgentSession).toHaveBeenLastCalledWith('work')
  answer.resolve('캐릭터 첫 응답')
  await answer.promise
  await Promise.resolve()
  expect(narration()?.text).toBe('Codex 응답')
  fireEvent.click(screen.getByRole('button', {name: '캐릭터 대화 선택'}))
  expect(narration()).toMatchObject({chat: CHARACTER_SPEECH_ID, text: '캐릭터 첫 응답'})
  fireEvent.input(screen.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'}), {
    target: {value: '다시 안녕'},
  })
  fireEvent.submit(screen.getByRole('form', {name: '캐릭터 대화 전송'}))
  await Promise.resolve()
  expect(screen.getAllByRole('status', {name: '캐릭터 대화'})).toHaveLength(1)
  expect(screen.getByRole('region', {name: '캐릭터 응답'})).toHaveTextContent('두 번째 응답')
  expect(narration()?.text).toBe('두 번째 응답')
  setSnapshot((previous) => ({...previous, registered: false}))
  expect(screen.queryByRole('status', {name: 'Codex 작업 알림'})).toBeNull()
  expect(screen.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'})).toBeEnabled()
})

it('should retain one identifiable bubble per chat while other chats emit new events', () => {
  vi.mocked(useVoice).mockReturnValue({
    available: () => true,
    error: () => null,
    playback: () => null,
    readoutId: () => undefined,
    status: () => 'idle',
    toggle: vi.fn(),
  })
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
  fireEvent.pointerEnter(screen.getByRole('list', {name: 'Codex 채팅 알림'}))
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
  vi.mocked(useVoice).mockReturnValue({
    available: () => true,
    error: () => null,
    playback: () => null,
    readoutId: () => undefined,
    status,
    toggle: vi.fn(),
  })
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
