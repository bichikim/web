import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {isTauri} from '@tauri-apps/api/core'
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow'
import {SSpeechComposer} from '../../src/components/SSpeechComposer'
import {startSpeechTurn} from '../../src/features/dictation/start-speech-turn'
import {transcribeAudio} from '../../src/features/dictation/transcribe-audio'
import 'virtual:uno.css'
import speechUrl from '../../../wallpaper-web/public/speech/overview/audio.mp3?url'

vi.mock('../../src/features/dictation/start-speech-turn', () => ({startSpeechTurn: vi.fn()}))
vi.mock('../../src/features/dictation/transcribe-audio', () => ({transcribeAudio: vi.fn()}))
vi.mock('@tauri-apps/api/core', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/core')>()),
  isTauri: vi.fn(),
}))
vi.mock('@tauri-apps/api/webviewWindow', () => ({getCurrentWebviewWindow: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

test.each([true, false])(
  'should start and send real Silero speech from native shortcut events without moving focus (continuous=%s)',
  async (continuous) => {
    const actual = await vi.importActual<
      typeof import('../../src/features/dictation/start-speech-turn')
    >('../../src/features/dictation/start-speech-turn')
    vi.mocked(startSpeechTurn).mockImplementation(actual.startSpeechTurn)
    vi.mocked(isTauri).mockReturnValue(true)
    let receive: () => void = () => undefined
    const listen = vi.fn(async (_event: string, callback: () => void) => {
      receive = callback
      return vi.fn()
    })
    vi.mocked(getCurrentWebviewWindow).mockReturnValue({listen} as unknown as ReturnType<
      typeof getCurrentWebviewWindow
    >)
    const context = new AudioContext()
    const output = context.createMediaStreamDestination()
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(output.stream)
    const buffer = await context.decodeAudioData(await (await fetch(speechUrl)).arrayBuffer())
    const recognition = Promise.withResolvers<string>()
    const answer = Promise.withResolvers<void>()
    vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
    const [draft, edit] = createSignal('기존 입력')
    const [busy, setBusy] = createSignal(false)
    const onSend = vi.fn(() => {
      setBusy(true)
      return answer.promise
    })
    const activate = () => {
      context.resume()
    }
    render(() => (
      <div class="w-65 bg-teal-50 p-3">
        <button type="button" onClick={activate}>
          다른 작업
        </button>
        <SSpeechComposer
          continuous={continuous}
          value={draft()}
          onEdit={edit}
          onSend={onSend}
          disabled={busy()}
        />
      </div>
    ))
    try {
      await page.getByRole('button', {name: '다른 작업'}).click()
      const focused = screen.getByRole('button', {name: '다른 작업'})
      focused.focus()
      expect(focused).toHaveFocus()
      await expect.poll(() => listen.mock.calls.length).toBe(1)
      receive()
      await expect
        .poll(() => vi.mocked(startSpeechTurn).mock.settledResults[0]?.type, {timeout: 5000})
        .toBe('fulfilled')
      expect(focused).toHaveFocus()
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(output)
      const ended = new Promise<void>((resolve) => {
        source.addEventListener('ended', () => resolve(), {once: true})
      })
      source.start(0, 0, 2.5)
      await ended
      expect(transcribeAudio).not.toHaveBeenCalled()
      receive()
      receive()
      await expect.poll(() => vi.mocked(transcribeAudio).mock.calls.length, {timeout: 5000}).toBe(1)
      expect(vi.mocked(transcribeAudio).mock.calls[0][0].audio.length).toBeGreaterThan(16_000)
      expect(output.stream.getAudioTracks()[0].readyState).toBe('ended')
      expect(focused).toHaveFocus()
      expect(onSend).not.toHaveBeenCalled()
      recognition.resolve('방금 들은 내용')
      await expect.poll(() => onSend.mock.calls.length).toBe(1)
      expect(draft()).toBe('기존 입력 방금 들은 내용')
      expect(startSpeechTurn).toHaveBeenCalledOnce()
      if (continuous) {
        expect(screen.getByRole('button', {name: '답변 중단하고 말하기'})).toHaveAttribute(
          'aria-pressed',
          'true',
        )
      }
    } finally {
      cleanup()
      answer.resolve()
      output.stream.getTracks().forEach((track) => track.stop())
      await context.close()
    }
  },
  20_000,
)

test('should send current Silero speech with the shortcut while retaining conversation mode', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/features/dictation/start-speech-turn')
  >('../../src/features/dictation/start-speech-turn')
  vi.mocked(startSpeechTurn).mockImplementation(actual.startSpeechTurn)
  const context = new AudioContext()
  const output = context.createMediaStreamDestination()
  vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(output.stream)
  const buffer = await context.decodeAudioData(await (await fetch(speechUrl)).arrayBuffer())
  const recognition = Promise.withResolvers<string>()
  const answer = Promise.withResolvers<void>()
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  const [draft, edit] = createSignal('기존 입력')
  const [busy, setBusy] = createSignal(false)
  const onSend = vi.fn(() => {
    expect(draft()).toBe('기존 입력 방금 들은 내용')
    setBusy(true)
    return answer.promise
  })
  const activate = () => {
    context.resume()
  }
  render(() => (
    <div class="w-65 bg-teal-50 p-3" onClick={activate}>
      <SSpeechComposer continuous value={draft()} onEdit={edit} onSend={onSend} disabled={busy()} />
    </div>
  ))
  try {
    await page.getByRole('button', {name: '연속 대화 시작'}).click()
    await expect
      .poll(() => vi.mocked(startSpeechTurn).mock.settledResults[0]?.type, {timeout: 5000})
      .toBe('fulfilled')
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(output)
    const ended = new Promise<void>((resolve) => {
      source.addEventListener('ended', () => resolve(), {once: true})
    })
    source.start(0, 0, 2.5)
    await ended
    expect(screen.getByRole('textbox')).toHaveFocus()
    expect(transcribeAudio).not.toHaveBeenCalled()
    await userEvent.keyboard('{Control>}{Enter}{/Control}')
    await expect.poll(() => vi.mocked(transcribeAudio).mock.calls.length, {timeout: 5000}).toBe(1)
    expect(vi.mocked(transcribeAudio).mock.calls[0][0].audio.length).toBeGreaterThan(16_000)
    expect(output.stream.getAudioTracks()[0].readyState).toBe('ended')
    expect(onSend).not.toHaveBeenCalled()
    recognition.resolve('방금 들은 내용')
    await expect.poll(() => onSend.mock.calls.length).toBe(1)
    expect(screen.getByRole('button', {name: '답변 중단하고 말하기'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(startSpeechTurn).toHaveBeenCalledOnce()
  } finally {
    cleanup()
    answer.resolve()
    output.stream.getTracks().forEach((track) => track.stop())
    await context.close()
  }
}, 20_000)

test('should send utterances automatically and pause until readout ends', async () => {
  const [draft, edit] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const [voiceBusy, setVoiceBusy] = createSignal(false)
  const first = Promise.withResolvers<Float32Array>()
  const second = Promise.withResolvers<Float32Array>()
  const answer = Promise.withResolvers<void>()
  const onSend = vi.fn(async () => {
    expect(draft()).toBe('첫 번째 말')
    setBusy(true)
    await answer.promise
    edit('')
    setVoiceBusy(true)
    setBusy(false)
  })
  vi.mocked(startSpeechTurn)
    .mockResolvedValueOnce({audio: first.promise, stop: vi.fn()})
    .mockResolvedValueOnce({audio: second.promise, stop: vi.fn()})
  vi.mocked(transcribeAudio).mockResolvedValue('첫 번째 말')
  render(() => (
    <div class="w-65 bg-teal-50 p-3">
      <SSpeechComposer
        continuous
        value={draft()}
        onEdit={edit}
        onSend={onSend}
        disabled={busy()}
        voiceBusy={voiceBusy()}
      />
    </div>
  ))
  await page.getByRole('button', {name: '연속 대화 시작'}).click()
  const microphone = screen.getByRole('button', {name: '연속 대화 종료'})
  await expect.poll(() => microphone.getAttribute('title')).toContain('듣는 중')
  expect(screen.getByRole('textbox')).toBeEnabled()
  first.resolve(new Float32Array([0.1]))
  await expect.poll(() => onSend.mock.calls.length).toBe(1)
  expect(microphone).toBeEnabled()
  expect(microphone).toHaveAttribute('aria-pressed', 'true')
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  answer.resolve()
  await expect.poll(busy).toBe(false)
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  await page.getByRole('form').screenshot({path: '__screenshots__/conversation-waiting.png'})
  setVoiceBusy(false)
  await expect.poll(() => startSpeechTurn.mock.calls.length).toBe(2)
  await expect.poll(() => microphone.getAttribute('title')).toContain('듣는 중')
  await page.getByRole('button', {name: '연속 대화 종료'}).click()
  second.resolve(new Float32Array([0.1]))
  await expect.poll(() => screen.getByRole('button', {name: '연속 대화 시작'})).toBe(microphone)
  expect(onSend).toHaveBeenCalledOnce()
  expect(vi.mocked(startSpeechTurn).mock.calls[1][0].aborted).toBe(true)
})

test.each(['typing', 'escape'] as const)('should end continuous mode on %s', async (action) => {
  const audio = Promise.withResolvers<Float32Array>()
  vi.mocked(startSpeechTurn).mockResolvedValue({audio: audio.promise, stop: vi.fn()})
  const onSend = vi.fn()
  render(() => <SSpeechComposer continuous onSend={onSend} />)
  await page.getByRole('button', {name: '연속 대화 시작'}).click()
  await expect
    .poll(() => screen.getByRole('button', {name: '연속 대화 종료'}).title)
    .toContain('듣는 중')
  switch (action) {
    case 'typing':
      await page.getByRole('textbox').fill('직접 입력')
      break
    case 'escape':
      await page.getByRole('textbox').click()
      await userEvent.keyboard('{Escape}')
      break
  }
  await expect.poll(() => screen.queryByRole('button', {name: '연속 대화 시작'})).not.toBeNull()
  audio.resolve(new Float32Array([0.1]))
  expect(vi.mocked(startSpeechTurn).mock.calls[0][0].aborted).toBe(true)
  expect(onSend).not.toHaveBeenCalled()
})
