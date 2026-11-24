import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {createEffect, createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SPoffoSpeechSurface} from '../../src/components/SPoffoSpeechSurface'
import {type CodexSnapshot, useCodexNotifications, useSpeechTarget} from '../../src/features/codex'
import {createLocalInference} from '../../src/features/inference/create-local-inference'
import {createModelProgress} from '../../src/features/inference/create-model-progress'
import {useWidgetSpeech} from '../../src/features/speech/use-widget-speech'
import {useVoice} from '../../src/features/voice/use-voice'
import type {VoiceMessage} from '../../src/features/voice/text'
import type {VoiceStatus} from '../../src/features/voice/readout'
import {startSpeechTurn} from '../../src/features/dictation/start-speech-turn'
import {transcribeAudio} from '../../src/features/dictation/transcribe-audio'
import 'virtual:uno.css'

vi.mock('../../src/features/inference/create-local-inference', () => ({
  createLocalInference: vi.fn(),
}))
vi.mock('../../src/features/dictation/start-speech-turn', () => ({startSpeechTurn: vi.fn()}))
vi.mock('../../src/features/dictation/transcribe-audio', () => ({transcribeAudio: vi.fn()}))
vi.mock('../../src/features/voice/use-voice', () => ({useVoice: vi.fn()}))
vi.mock('../../src/features/semantics/use-semantic-input', () => ({useSemanticInput: vi.fn()}))
vi.mock('../../src/features/codex/use-codex-notifications', () => ({
  useCodexNotifications: vi.fn(),
}))
vi.mock('../../src/features/codex/use-speech-target', () => ({useSpeechTarget: vi.fn()}))
vi.mock('../../src/features/speech/use-widget-speech', () => ({useWidgetSpeech: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

test('should resume character listening after the selected response finishes narration', async () => {
  const first = Promise.withResolvers<Float32Array>()
  const second = Promise.withResolvers<Float32Array>()
  const answer = Promise.withResolvers<string>()
  const run = vi
    .fn<ReturnType<typeof createLocalInference>['run']>()
    .mockReturnValue(answer.promise)
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
  vi.mocked(startSpeechTurn)
    .mockResolvedValueOnce({audio: first.promise, stop: vi.fn()})
    .mockResolvedValueOnce({audio: second.promise, stop: vi.fn()})
  vi.mocked(transcribeAudio).mockResolvedValue('오늘 어때?')
  vi.mocked(useWidgetSpeech).mockReturnValue({
    error: () => null,
    speech: () => ({enabled: true, x: 0.9, y: 0.05}),
  })
  vi.mocked(useSpeechTarget).mockReturnValue(() => ({
    anchor: 'bottom',
    maxHeight: 568,
    x: 160,
    y: 680,
  }))
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
    snapshot: () => ({activity: null, received: true, recent: [], registered: false, sessions: []}),
  })
  const [voiceState, setVoiceState] = createSignal<VoiceStatus>('idle')
  let narration: () => VoiceMessage | null = () => null
  let lastMessage: string | undefined
  vi.mocked(useVoice).mockImplementation((props) => {
    narration = props.message
    createEffect(() => {
      const message = props.message()
      if (message === null) {
        setVoiceState('idle')
      } else if (message.id !== lastMessage) {
        lastMessage = message.id
        setVoiceState('generating')
      }
    })
    return {
      available: () => true,
      error: () => null,
      readoutId: () => undefined,
      status: voiceState,
      toggle: vi.fn(),
    }
  })
  render(() => (
    <div class="w-80">
      <SPoffoSpeechSurface widgetId="character-widget" />
    </div>
  ))
  await page.getByRole('button', {name: '연속 대화 시작'}).click()
  const microphone = screen.getByRole('button', {name: '연속 대화 종료'})
  await expect.poll(() => microphone.title).toContain('듣는 중')
  expect(narration()).toBeNull()
  first.resolve(new Float32Array([0.1]))
  await expect.poll(() => run.mock.calls.length).toBe(1)
  expect(run.mock.calls[0][0]).toMatchObject({messages: [{content: '오늘 어때?', role: 'user'}]})
  expect(microphone).toBeEnabled()
  answer.resolve('너와 이야기해서 좋아!')
  await expect.poll(voiceState).toBe('generating')
  expect(narration()?.text).toBe('너와 이야기해서 좋아!')
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  setVoiceState('playing')
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  expect(screen.getAllByRole('button', {name: '음성 일시정지'})).toHaveLength(1)
  setVoiceState('paused')
  expect(screen.getAllByRole('button', {name: '음성 재생'})).toHaveLength(1)
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  setVoiceState('buffering')
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  setVoiceState('idle')
  await expect.poll(() => startSpeechTurn.mock.calls.length).toBe(2)
  await expect.poll(() => microphone.title).toContain('듣는 중')
  expect(narration()).toBeNull()
  await page.getByRole('button', {name: '연속 대화 종료'}).click()
  second.resolve(new Float32Array([0.1]))
  expect(screen.getByRole('button', {name: '연속 대화 시작'})).toBe(microphone)
})

test.each(['top', 'bottom'] as const)(
  'should retain one character bubble and select its narration with %s stacking',
  async (anchor) => {
    const answer = Promise.withResolvers<string>()
    let reportStatus: ((text: string) => void) | undefined
    const run = vi
      .fn<ReturnType<typeof createLocalInference>['run']>()
      .mockImplementationOnce((_input, _signal, onStatus) => {
        reportStatus = onStatus
        return answer.promise
      })
      .mockResolvedValueOnce('두 번째 캐릭터 답변')
    vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
    vi.mocked(useWidgetSpeech).mockReturnValue({
      error: () => null,
      speech: () => ({enabled: true, x: 0.9, y: 0.05}),
    })
    vi.mocked(useSpeechTarget).mockReturnValue(() => ({
      anchor,
      maxHeight: 320,
      x: 160,
      y: anchor === 'top' ? 0 : 680,
    }))
    const [snapshot, setSnapshot] = createSignal<CodexSnapshot>({
      activity: null,
      received: true,
      recent: [],
      registered: true,
      sessions: [
        {
          notificationId: 1,
          phase: 'response',
          receivedAt: 1,
          sessionId: 'work',
          text: 'Codex의 응답',
          title: '작업',
          tool: null,
        },
      ],
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
    let narration: () => VoiceMessage | null = () => null
    vi.mocked(useVoice).mockImplementation((props) => {
      narration = props.message
      return {
        available: () => true,
        error: () => null,
        readoutId: () => undefined,
        status: () => 'idle',
        toggle: vi.fn(),
      }
    })
    render(() => (
      <div class="w-80">
        <SPoffoSpeechSurface widgetId="character-widget" />
      </div>
    ))
    const stack = screen.getByRole('list', {name: '대화 말풍선'})
    await userEvent.hover(screen.getByRole('button', {name: '채팅 작업 선택'}))
    await expect.poll(() => screen.queryByRole('status', {name: '캐릭터 대화'})).not.toBeNull()
    const character = screen.getByRole('status', {name: '캐릭터 대화'})
    await page.getByRole('button', {name: '캐릭터 대화 선택'}).click()
    await expect.poll(() => stack.dataset.moving, {timeout: 5000}).toBe('false')
    await page.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'}).fill('안녕')
    await page
      .getByRole('form', {name: '캐릭터 대화 전송'})
      .getByRole('button', {name: '보내기'})
      .click()
    const cancel = within(character).getByRole('button', {name: '취소'})
    cancel.focus()
    const progress = createModelProgress((text) => reportStatus?.(text))
    const total = {
      files: {},
      loaded: 40,
      name: 'model',
      progress: 40,
      status: 'progress_total' as const,
      total: 100,
    }
    progress(total)
    progress({
      file: 'second.onnx',
      loaded: 0,
      name: 'model',
      progress: 0,
      status: 'progress',
      total: 100,
    })
    progress({...total, loaded: 20, progress: 20})
    expect(within(character).getByRole('status')).toHaveTextContent('모델 다운로드 중 · 40%')
    progress({...total, loaded: 41, progress: 41})
    expect(within(character).getByRole('status')).toHaveTextContent('모델 다운로드 중 · 41%')
    expect(within(character).getByRole('button', {name: '취소'})).toBe(cancel)
    expect(document.activeElement).toBe(cancel)
    await page.getByRole('button', {name: '채팅 작업 선택'}).click()
    await expect.poll(() => stack.dataset.moving, {timeout: 5000}).toBe('false')
    const response = `캐릭터의 첫 답변\n${'캐릭터 응답 본문\n'.repeat(50)}`
    answer.resolve(response)
    await expect.poll(() => within(character).getByRole('region').textContent).toContain('첫 답변')
    expect(narration()?.text).toBe('Codex의 응답')
    await page.getByRole('button', {name: '캐릭터 대화 선택'}).click()
    await expect.poll(() => stack.dataset.moving, {timeout: 5000}).toBe('false')
    expect(narration()?.text).toBe(response.trim().replaceAll('\n', ' '))
    const region = within(character).getByRole('region', {name: '캐릭터 응답'})
    expect(region.clientHeight).toBeGreaterThanOrEqual(64)
    expect(character.getBoundingClientRect().height).toBeLessThanOrEqual(250)
    const input = within(character).getByRole('textbox')
    const bounds = input.getBoundingClientRect()
    region.scrollTop = region.scrollHeight
    expect(region.scrollTop).toBeGreaterThan(0)
    expect(input.getBoundingClientRect().top).toBe(bounds.top)
    expect(bounds.width).toBeGreaterThan(100)
    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(320)
    expect(character.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
    expect(character.getBoundingClientRect().bottom).toBeLessThanOrEqual(innerHeight)
    await page.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'}).fill('한 번 더')
    await page
      .getByRole('form', {name: '캐릭터 대화 전송'})
      .getByRole('button', {name: '보내기'})
      .click()
    await expect.poll(() => within(character).getByRole('region').textContent).toContain('두 번째')
    await expect
      .poll(() => within(character).getByRole('region').clientHeight)
      .toBeLessThanOrEqual(40)
    expect(screen.getByRole('status', {name: '캐릭터 대화'})).toBe(character)
    setSnapshot((previous) => ({...previous, registered: false}))
    expect(screen.queryByRole('status', {name: 'Codex 작업 알림'})).toBeNull()
    expect(within(character).getByRole('textbox')).toBeEnabled()
  },
)
