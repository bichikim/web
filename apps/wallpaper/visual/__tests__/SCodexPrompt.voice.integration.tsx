import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import speechUrl from '../../../wallpaper-web/public/speech/overview/audio.mp3?url'
import {SCodexPrompt} from '../../src/components/SCodexPrompt'
import {startSpeechTurn} from '../../src/features/dictation/start-speech-turn'
import {transcribeAudio} from '../../src/features/dictation/transcribe-audio'
import 'virtual:uno.css'

vi.mock('../../src/features/dictation/start-speech-turn', () => ({startSpeechTurn: vi.fn()}))
vi.mock('../../src/features/dictation/transcribe-audio', () => ({transcribeAudio: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

test('should send after Control+Enter finishes real Silero speech and the final transcript', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/features/dictation/start-speech-turn')
  >('../../src/features/dictation/start-speech-turn')
  vi.mocked(startSpeechTurn).mockImplementation(actual.startSpeechTurn)
  const context = new AudioContext()
  const output = context.createMediaStreamDestination()
  vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(output.stream)
  const buffer = await context.decodeAudioData(await (await fetch(speechUrl)).arrayBuffer())
  const recognition = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  const send = vi.fn().mockResolvedValue(undefined)
  const activate = () => {
    context.resume()
  }
  render(() => (
    <div class="w-68 p-3" onClick={activate}>
      <SCodexPrompt sessionId="final-speech-check" onSend={send} />
    </div>
  ))
  try {
    await page.getByRole('textbox').fill('이미 작성한 요청')
    await page.getByRole('button', {name: '음성 입력'}).click()
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
    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox')).toHaveFocus()
    await userEvent.keyboard('{Control>}{Enter}{/Control}')
    await expect.poll(() => vi.mocked(transcribeAudio).mock.calls.length, {timeout: 5000}).toBe(1)
    expect(vi.mocked(transcribeAudio).mock.calls[0][0].audio.length).toBeGreaterThan(16_000)
    expect(output.stream.getAudioTracks()[0].readyState).toBe('ended')
    expect(send).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox')).toHaveValue('이미 작성한 요청')
    expect(screen.getByRole('button', {name: '보내기'})).toBeDisabled()
    recognition.resolve('방금 말한 마지막 내용')
    await expect.poll(() => send.mock.calls.length).toBe(1)
    expect(send).toHaveBeenCalledExactlyOnceWith(
      'final-speech-check',
      '이미 작성한 요청 방금 말한 마지막 내용',
    )
    expect(startSpeechTurn).toHaveBeenCalledOnce()
  } finally {
    cleanup()
    output.stream.getTracks().forEach((track) => track.stop())
    await context.close()
  }
}, 20_000)

test('should append two real Silero utterances while listening and wait for Codex submission', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/features/dictation/start-speech-turn')
  >('../../src/features/dictation/start-speech-turn')
  vi.mocked(startSpeechTurn).mockImplementation(actual.startSpeechTurn)
  const context = new AudioContext()
  const streams: MediaStreamAudioDestinationNode[] = []
  vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(async () => {
    const output = context.createMediaStreamDestination()
    streams.push(output)
    return output.stream
  })
  const response = await fetch(speechUrl)
  const buffer = await context.decodeAudioData(await response.arrayBuffer())
  const play = (output: MediaStreamAudioDestinationNode) => {
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(output)
    source.start(0, 0, 2.5)
  }
  const recognition = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio)
    .mockReturnValueOnce(recognition.promise)
    .mockResolvedValueOnce('두 번째 말')
  const send = vi.fn().mockResolvedValue(undefined)
  const activate = () => {
    context.resume()
  }
  render(() => (
    <div class="w-68 p-3" onClick={activate}>
      <SCodexPrompt sessionId="dictation-check" onSend={send} />
    </div>
  ))
  try {
    await page.getByRole('textbox', {name: 'Codex에 보낼 메시지'}).fill('기존 초안')
    await page.getByRole('button', {name: '음성 입력'}).click()
    await expect
      .poll(() => vi.mocked(startSpeechTurn).mock.settledResults[0]?.type, {timeout: 5000})
      .toBe('fulfilled')
    play(streams[0])
    await expect
      .poll(() => vi.mocked(startSpeechTurn).mock.settledResults[1]?.type, {timeout: 10_000})
      .toBe('fulfilled')
    expect(transcribeAudio).toHaveBeenCalledOnce()
    expect(streams[1].stream.getAudioTracks()[0].readyState).toBe('live')
    expect(screen.getByRole('textbox')).toBeEnabled()
    await page.getByRole('textbox').fill('직접 수정한 초안')
    play(streams[1])
    await expect.poll(() => vi.mocked(startSpeechTurn).mock.calls.length, {timeout: 10_000}).toBe(3)
    expect(transcribeAudio).toHaveBeenCalledOnce()
    recognition.resolve('첫 번째 말')
    await expect
      .element(page.getByRole('textbox'))
      .toHaveValue('직접 수정한 초안 첫 번째 말 두 번째 말')
    expect(send).not.toHaveBeenCalled()
    expect(screen.getByRole('button', {name: '녹음 끝내기'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page
      .getByRole('form')
      .screenshot({path: '__screenshots__/codex-continuous-dictation.png'})
    await page.getByRole('button', {name: '보내기'}).click()
    expect(send).toHaveBeenCalledExactlyOnceWith(
      'dictation-check',
      '직접 수정한 초안 첫 번째 말 두 번째 말',
    )
  } finally {
    cleanup()
    streams.forEach((output) => output.stream.getTracks().forEach((track) => track.stop()))
    await context.close()
  }
}, 30_000)
