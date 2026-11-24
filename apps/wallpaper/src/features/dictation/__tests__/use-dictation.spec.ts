/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {startSpeechTurn} from '../start-speech-turn'
import {transcribeAudio} from '../transcribe-audio'
import {useDictation} from '../use-dictation'
import {createDictationPreferences} from '../preferences'

vi.mock('../start-speech-turn', () => ({startSpeechTurn: vi.fn()}))
vi.mock('../transcribe-audio', () => ({transcribeAudio: vi.fn()}))
vi.mock('../preferences', () => ({createDictationPreferences: vi.fn()}))
beforeEach(() => {
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
    save: vi.fn(),
  })
})
afterEach(() => vi.resetAllMocks())
const turn = () => {
  const audio = Promise.withResolvers<Float32Array>()
  vi.mocked(startSpeechTurn).mockImplementationOnce(async (signal) => {
    signal.addEventListener('abort', () => audio.reject(signal.reason), {once: true})
    return {audio: audio.promise, stop: () => audio.resolve(new Float32Array())}
  })
  return audio
}

it('should finish recording and wait for queued and final transcripts before resolving', async () => {
  const first = turn()
  const final = Promise.withResolvers<Float32Array>()
  const stop = vi.fn(() => final.resolve(new Float32Array([0.2])))
  vi.mocked(startSpeechTurn).mockResolvedValueOnce({audio: final.promise, stop})
  const recognized = Promise.withResolvers<string>()
  const last = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio)
    .mockReturnValueOnce(recognized.promise)
    .mockReturnValueOnce(last.promise)
  const onText = vi.fn()
  const owner = createRoot((dispose) => ({dictation: useDictation({onText}), dispose}))
  owner.dictation.toggle()
  await flushPromises()
  first.resolve(new Float32Array([0.1]))
  await flushPromises()
  const completed = vi.fn()
  const finishing = owner.dictation.finish().then(completed)
  owner.dictation.finish()
  await flushPromises()
  expect(stop).toHaveBeenCalledOnce()
  expect(completed).not.toHaveBeenCalled()
  recognized.resolve('첫 발화')
  await flushPromises()
  expect(onText).toHaveBeenCalledExactlyOnceWith('첫 발화')
  expect(completed).not.toHaveBeenCalled()
  last.resolve('마지막 발화')
  await finishing
  expect(onText.mock.calls).toEqual([['첫 발화'], ['마지막 발화']])
  expect(completed).toHaveBeenCalledExactlyOnceWith(true)
  expect(owner.dictation.state()).toBe('idle')
  expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  owner.dispose()
})

it('should not report a completed finish after cancellation', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  vi.mocked(startSpeechTurn).mockResolvedValueOnce({
    audio: audio.promise,
    stop: () => audio.resolve(new Float32Array([0.1])),
  })
  const recognition = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  const onText = vi.fn()
  const owner = createRoot((dispose) => ({dictation: useDictation({onText}), dispose}))
  owner.dictation.toggle()
  await flushPromises()
  const finishing = owner.dictation.finish()
  await flushPromises()
  owner.dictation.cancel()
  recognition.resolve('늦은 발화')
  expect(await finishing).toBe(false)
  expect(onText).not.toHaveBeenCalled()
  owner.dispose()
})

it('should capture the next utterance during recognition and deliver queued transcripts in order', async () => {
  const first = turn()
  const second = turn()
  turn()
  const recognized = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio)
    .mockReturnValueOnce(recognized.promise)
    .mockResolvedValueOnce('두 번째 말')
  const onText = vi.fn()
  const owner = createRoot((dispose) => ({dictation: useDictation({onText}), dispose}))
  owner.dictation.toggle()
  await flushPromises()
  first.resolve(new Float32Array([0.1]))
  await flushPromises()
  expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  expect(owner.dictation.state()).toBe('recording')
  expect(onText).not.toHaveBeenCalled()
  second.resolve(new Float32Array([0.2]))
  await flushPromises()
  expect(startSpeechTurn).toHaveBeenCalledTimes(3)
  expect(transcribeAudio).toHaveBeenCalledOnce()
  recognized.resolve('첫 번째 말')
  await flushPromises()
  expect(onText.mock.calls).toEqual([['첫 번째 말'], ['두 번째 말']])
  expect(owner.dictation.state()).toBe('recording')
  owner.dispose()
  await flushPromises()
})

it('should finish completed utterances after the microphone is switched off', async () => {
  const audio = turn()
  turn()
  const recognition = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  const onText = vi.fn()
  const owner = createRoot((dispose) => ({dictation: useDictation({onText}), dispose}))
  owner.dictation.toggle()
  await flushPromises()
  audio.resolve(new Float32Array([0.1]))
  await flushPromises()
  owner.dictation.toggle()
  await flushPromises()
  expect(owner.dictation.state()).toBe('transcribing')
  recognition.resolve('마지막 완료된 문장')
  await flushPromises()
  expect(onText).toHaveBeenCalledExactlyOnceWith('마지막 완료된 문장')
  expect(owner.dictation.state()).toBe('idle')
  expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  owner.dispose()
})

it('should transcribe the final utterance produced by switching the microphone off', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  const stop = vi.fn(() => audio.resolve(new Float32Array([0.3])))
  vi.mocked(startSpeechTurn).mockResolvedValueOnce({audio: audio.promise, stop})
  vi.mocked(transcribeAudio).mockResolvedValue('마지막 발화')
  const onText = vi.fn()
  const owner = createRoot((dispose) => ({dictation: useDictation({onText}), dispose}))
  owner.dictation.toggle()
  await flushPromises()
  owner.dictation.toggle()
  await flushPromises()
  expect(stop).toHaveBeenCalledOnce()
  expect(onText).toHaveBeenCalledExactlyOnceWith('마지막 발화')
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  expect(owner.dictation.state()).toBe('idle')
  owner.dispose()
})

it('should discard queued recognition and late microphone levels when its bubble is deselected', async () => {
  const audio = turn()
  turn()
  const recognition = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  const [enabled, setEnabled] = createSignal(true)
  const onText = vi.fn()
  const owner = createRoot((dispose) => ({dictation: useDictation({enabled, onText}), dispose}))
  owner.dictation.toggle()
  await flushPromises()
  audio.resolve(new Float32Array([0.1]))
  await flushPromises()
  const [signal, level] = vi.mocked(startSpeechTurn).mock.calls[1]
  level?.(0.8)
  expect(owner.dictation.level()).toBe(0.8)
  setEnabled(false)
  level?.(0.9)
  recognition.resolve('늦게 도착한 말')
  await flushPromises()
  expect(signal.aborted).toBe(true)
  expect(vi.mocked(transcribeAudio).mock.calls[0][0].signal.aborted).toBe(true)
  expect(onText).not.toHaveBeenCalled()
  expect(owner.dictation.level()).toBe(0)
  expect(owner.dictation.state()).toBe('idle')
  owner.dispose()
})

it('should use saved model settings for each utterance and quietly skip empty transcripts', async () => {
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: false}),
    save: vi.fn(),
  })
  const audio = turn()
  turn()
  vi.mocked(transcribeAudio).mockResolvedValue('')
  const onText = vi.fn()
  const owner = createRoot((dispose) => ({dictation: useDictation({onText}), dispose}))
  owner.dictation.toggle()
  await flushPromises()
  audio.resolve(new Float32Array([0.1]))
  await flushPromises()
  expect(transcribeAudio).toHaveBeenCalledWith(
    expect.objectContaining({model: 'buzzasr-korean-q8', vad: false}),
  )
  expect(onText).not.toHaveBeenCalled()
  expect(owner.dictation.error()).toBeNull()
  expect(owner.dictation.state()).toBe('recording')
  owner.dispose()
  await flushPromises()
})

it('should stop on recognition failure and permit an explicit retry', async () => {
  const audio = turn()
  turn()
  vi.mocked(transcribeAudio).mockRejectedValue(new Error('인식 실패'))
  const owner = createRoot((dispose) => ({dictation: useDictation({}), dispose}))
  owner.dictation.toggle()
  await flushPromises()
  audio.resolve(new Float32Array([0.1]))
  await flushPromises()
  expect(owner.dictation.error()).toBe('인식 실패')
  expect(owner.dictation.state()).toBe('idle')
  turn()
  owner.dictation.toggle()
  await flushPromises()
  expect(owner.dictation.error()).toBeNull()
  expect(owner.dictation.state()).toBe('recording')
  owner.dispose()
  await flushPromises()
})

it('should report microphone failures and cancel a pending microphone request on another click', async () => {
  vi.mocked(startSpeechTurn).mockRejectedValueOnce(new Error('마이크 권한을 확인해 주세요.'))
  const owner = createRoot((dispose) => ({dictation: useDictation({}), dispose}))
  owner.dictation.toggle()
  await flushPromises()
  expect(owner.dictation.error()).toBe('마이크 권한을 확인해 주세요.')
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof startSpeechTurn>>>()
  vi.mocked(startSpeechTurn).mockReturnValueOnce(pending.promise)
  owner.dictation.toggle()
  owner.dictation.toggle()
  pending.resolve({audio: Promise.resolve(new Float32Array()), stop: vi.fn()})
  await flushPromises()
  expect(vi.mocked(startSpeechTurn).mock.calls[1][0].aborted).toBe(true)
  expect(owner.dictation.state()).toBe('idle')
  expect(transcribeAudio).not.toHaveBeenCalled()
  owner.dispose()
})
