import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {SPoffoSpeechSurface} from '../../src/components/SPoffoSpeechSurface'
import {useCodexNotifications, useSpeechTarget} from '../../src/features/codex'
import {startSpeechTurn} from '../../src/features/dictation/start-speech-turn'
import {transcribeAudio} from '../../src/features/dictation/transcribe-audio'
import {createLocalInference} from '../../src/features/inference/create-local-inference'
import {useWidgetSpeech} from '../../src/features/speech/use-widget-speech'
import {createVoiceClient} from '../../src/features/voice/client'
import 'virtual:uno.css'

vi.mock('../../src/features/codex/use-codex-notifications', () => ({
  useCodexNotifications: vi.fn(),
}))
vi.mock('../../src/features/codex/use-speech-target', () => ({useSpeechTarget: vi.fn()}))
vi.mock('../../src/features/dictation/start-speech-turn', () => ({startSpeechTurn: vi.fn()}))
vi.mock('../../src/features/dictation/transcribe-audio', () => ({transcribeAudio: vi.fn()}))
vi.mock('../../src/features/inference/create-local-inference', () => ({
  createLocalInference: vi.fn(),
}))
vi.mock('../../src/features/speech/use-widget-speech', () => ({useWidgetSpeech: vi.fn()}))
vi.mock('../../src/features/voice/client', () => ({createVoiceClient: vi.fn()}))
vi.mock('../../src/features/semantics/use-semantic-input', () => ({useSemanticInput: vi.fn()}))
beforeEach(() => {
  vi.mocked(useWidgetSpeech).mockReturnValue({
    error: () => null,
    speech: () => ({
      enabled: true,
      voice: {...DEFAULT_POFFO_VOICE, enabled: true},
      x: 0.9,
      y: 0.05,
    }),
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
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

test('should read only the new reply after each shortcut voice turn with the real readout controller', async () => {
  const warn = vi.spyOn(console, 'warn')
  const first = Promise.withResolvers<Float32Array>()
  const second = Promise.withResolvers<Float32Array>()
  const third = Promise.withResolvers<Float32Array>()
  const stop = vi.fn(() => first.resolve(Float32Array.of(0.1)))
  const answer = Promise.withResolvers<string>()
  const run = vi.fn().mockResolvedValueOnce('첫 답변입니다.').mockReturnValueOnce(answer.promise)
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
  vi.mocked(startSpeechTurn)
    .mockResolvedValueOnce({audio: first.promise, stop})
    .mockResolvedValueOnce({
      audio: second.promise,
      stop: () => second.resolve(Float32Array.of(0.1)),
    })
    .mockResolvedValueOnce({audio: third.promise, stop: vi.fn()})
  vi.mocked(transcribeAudio).mockResolvedValueOnce('첫 번째 말').mockResolvedValueOnce('두 번째 말')
  const playback: Array<ReturnType<typeof Promise.withResolvers<void>>> = []
  const prepare = vi.fn().mockResolvedValue({sampleRate: 24_000, samples: Float32Array.of(0.1)})
  const play = vi.fn<ReturnType<typeof createVoiceClient>['play']>((_audio, _voice, signal) => {
    const pending = Promise.withResolvers<void>()
    playback.push(pending)
    signal.addEventListener('abort', () => pending.reject(signal.reason), {once: true})
    return pending.promise
  })
  vi.mocked(createVoiceClient).mockReturnValue({dispose: vi.fn(), play, prepare})
  render(() => (
    <div class="w-80">
      <SPoffoSpeechSurface widgetId="character-widget" />
    </div>
  ))
  await page.getByRole('button', {name: '연속 대화 시작'}).click()
  const microphone = screen.getByRole('button', {name: '연속 대화 종료'})
  await expect.poll(() => microphone.title).toContain('듣는 중')
  expect(screen.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'})).toHaveFocus()
  await userEvent.keyboard('{Control>}{Enter}{/Control}')
  await expect.poll(() => playback.length).toBe(1)
  expect(stop).toHaveBeenCalledOnce()
  expect(prepare.mock.calls.map(([text]) => text)).toEqual(['첫 답변입니다.'])
  playback[0].resolve()
  await expect.poll(() => startSpeechTurn.mock.calls.length).toBe(2)
  await expect.poll(() => microphone.title).toContain('듣는 중')
  expect(screen.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'})).toHaveFocus()
  await userEvent.keyboard('{Control>}{Enter}{/Control}')
  await expect.poll(() => run.mock.calls.length).toBe(2)
  expect(screen.getByRole('region', {name: '캐릭터 응답'})).toHaveTextContent('첫 답변입니다.')
  expect(prepare.mock.calls.map(([text]) => text)).toEqual(['첫 답변입니다.'])
  answer.resolve('새 답변입니다.')
  await expect.poll(() => playback.length).toBe(2)
  expect(prepare.mock.calls.map(([text]) => text)).toEqual(['첫 답변입니다.', '새 답변입니다.'])
  playback[1].resolve()
  await expect.poll(() => startSpeechTurn.mock.calls.length).toBe(3)
  await expect.poll(() => microphone.title).toContain('듣는 중')
  await page.getByRole('button', {name: '연속 대화 종료'}).click()
  third.resolve(Float32Array.of(0.1))
  expect(screen.getByRole('button', {name: '연속 대화 시작'})).toBe(microphone)
  expect(prepare.mock.calls.map(([text]) => text)).toEqual(['첫 답변입니다.', '새 답변입니다.'])
  expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('computations created outside'))
})

test.each(['reply', 'synthesis', 'playback'] as const)(
  'should interrupt %s from the waiting microphone and listen to a fresh utterance immediately',
  async (phase) => {
    const first = Promise.withResolvers<Float32Array>()
    const second = Promise.withResolvers<Float32Array>()
    const third = Promise.withResolvers<Float32Array>()
    const reply = Promise.withResolvers<string>()
    const synthesis = Promise.withResolvers<{sampleRate: number; samples: Float32Array}>()
    const run = vi.fn().mockReturnValueOnce(reply.promise).mockResolvedValueOnce('새 답변입니다.')
    vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
    vi.mocked(startSpeechTurn)
      .mockResolvedValueOnce({audio: first.promise, stop: vi.fn()})
      .mockResolvedValueOnce({audio: second.promise, stop: vi.fn()})
      .mockResolvedValueOnce({audio: third.promise, stop: vi.fn()})
    vi.mocked(transcribeAudio).mockResolvedValueOnce('중단할 말').mockResolvedValueOnce('새로운 말')
    const prepare = vi.fn<ReturnType<typeof createVoiceClient>['prepare']>(
      (text, _voice, signal) => {
        if (phase === 'synthesis' && text === '중단할 답변입니다.') {
          signal.addEventListener('abort', () => synthesis.reject(signal.reason), {once: true})
          return synthesis.promise
        }
        return Promise.resolve({sampleRate: 24_000, samples: Float32Array.of(0.1)})
      },
    )
    const playback: Array<ReturnType<typeof Promise.withResolvers<void>>> = []
    const play = vi.fn<ReturnType<typeof createVoiceClient>['play']>((_audio, _voice, signal) => {
      const pending = Promise.withResolvers<void>()
      playback.push(pending)
      signal.addEventListener('abort', () => pending.reject(signal.reason), {once: true})
      return pending.promise
    })
    vi.mocked(createVoiceClient).mockReturnValue({dispose: vi.fn(), play, prepare})
    render(() => (
      <div class="w-80">
        <SPoffoSpeechSurface widgetId="character-widget" />
      </div>
    ))
    await page.getByRole('button', {name: '연속 대화 시작'}).click()
    await expect.poll(() => startSpeechTurn.mock.calls.length).toBe(1)
    first.resolve(Float32Array.of(0.1))
    await expect.poll(() => run.mock.calls.length).toBe(1)
    if (phase !== 'reply') {
      reply.resolve('중단할 답변입니다.')
      await expect.poll(() => prepare.mock.calls.length).toBe(1)
      if (phase === 'playback') {
        await expect.poll(() => play.mock.calls.length).toBe(1)
      }
    }
    const microphone = screen.getByRole('button', {name: '답변 중단하고 말하기'})
    expect(microphone).toBeEnabled()
    expect(microphone.title).toContain('마이크 대기 중')
    await page
      .getByRole('main')
      .screenshot({path: `__screenshots__/conversation-waiting-${phase}.png`})
    await page.getByRole('button', {name: '답변 중단하고 말하기'}).click()
    await expect.poll(() => startSpeechTurn.mock.calls.length).toBe(2)
    expect(run.mock.calls[0][1].aborted).toBe(phase === 'reply')
    if (phase !== 'reply') {
      expect(prepare.mock.calls[0][2].aborted).toBe(true)
    }
    if (phase === 'playback') {
      expect(play.mock.calls[0][2].aborted).toBe(true)
    }
    expect(screen.getByRole('textbox')).toBeEnabled()
    expect(screen.getByRole('textbox')).toHaveValue('')
    await expect.poll(() => microphone.title).toContain('듣는 중')
    if (phase === 'reply') {
      reply.resolve('중단 후 늦게 도착한 답변입니다.')
    }
    second.resolve(Float32Array.of(0.1))
    await expect.poll(() => run.mock.calls.length).toBe(2)
    expect(run.mock.calls[1][0].messages.at(-1)).toEqual({content: '새로운 말', role: 'user'})
    await expect.poll(() => playback.length).toBe(phase === 'playback' ? 2 : 1)
    expect(screen.getByRole('region', {name: '캐릭터 응답'})).toHaveTextContent('새 답변입니다.')
    expect(prepare.mock.calls.map(([text]) => text)).not.toContain(
      '중단 후 늦게 도착한 답변입니다.',
    )
    playback.at(-1)!.resolve()
    await expect.poll(() => startSpeechTurn.mock.calls.length).toBe(3)
    await page.getByRole('button', {name: '연속 대화 종료'}).click()
    third.resolve(new Float32Array())
    expect(screen.getByRole('button', {name: '연속 대화 시작'})).toBe(microphone)
  },
)
