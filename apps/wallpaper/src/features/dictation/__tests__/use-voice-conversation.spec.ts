/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useVoiceConversation} from '../use-voice-conversation'
import {startSpeechTurn} from '../start-speech-turn'
import {transcribeAudio} from '../transcribe-audio'
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
  vi.mocked(startSpeechTurn).mockResolvedValue({audio: audio.promise, stop: vi.fn()})
  return audio
}
const flush = async () => {
  await Array.from({length: 12}).reduce<Promise<void>>(
    (previous) => previous.then(() => undefined),
    Promise.resolve(),
  )
}

it('should interrupt a pending reply and start listening before that reply settles', async () => {
  const first = turn()
  const answer = Promise.withResolvers<void>()
  const [paused, setPaused] = createSignal(false)
  const onSend = vi.fn(() => {
    setPaused(true)
    return answer.promise
  })
  const onInterrupt = vi.fn(() => setPaused(false))
  vi.mocked(transcribeAudio).mockResolvedValue('첫 번째 말')
  const owner = createRoot((dispose) => ({
    conversation: useVoiceConversation({onInterrupt, onSend, paused}),
    dispose,
  }))
  owner.conversation.toggle()
  await flush()
  first.resolve(Float32Array.of(0.1))
  await flush()
  expect(owner.conversation.state()).toBe('waiting')
  const next = turn()
  owner.conversation.toggle()
  await flush()
  expect(onInterrupt).toHaveBeenCalledOnce()
  expect(vi.mocked(startSpeechTurn).mock.calls[0][0].aborted).toBe(true)
  expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  expect(owner.conversation.state()).toBe('recording')
  answer.resolve()
  await flush()
  expect(owner.conversation.state()).toBe('recording')
  expect(owner.conversation.active()).toBe(true)
  expect(vi.mocked(startSpeechTurn).mock.calls[1][0].aborted).toBe(false)
  owner.dispose()
  next.resolve(new Float32Array())
})

it('should interrupt an existing reply when starting the microphone from idle', async () => {
  const [paused, setPaused] = createSignal(true)
  const onInterrupt = vi.fn(() => setPaused(false))
  const audio = turn()
  const owner = createRoot((dispose) => ({
    conversation: useVoiceConversation({onInterrupt, onSend: vi.fn(), paused}),
    dispose,
  }))
  owner.conversation.toggle()
  await flush()
  expect(onInterrupt).toHaveBeenCalledOnce()
  expect(owner.conversation.state()).toBe('recording')
  owner.dispose()
  audio.resolve(new Float32Array())
})

it('should submit the current utterance once on request and resume after reply waiting', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  const stop = vi.fn(() => audio.resolve(new Float32Array([0.1])))
  vi.mocked(startSpeechTurn).mockResolvedValueOnce({audio: audio.promise, stop})
  const recognition = Promise.withResolvers<string>()
  const answer = Promise.withResolvers<void>()
  const [paused, setPaused] = createSignal(false)
  const onSend = vi.fn(() => {
    setPaused(true)
    return answer.promise
  })
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  const owner = createRoot((dispose) => ({
    conversation: useVoiceConversation({onSend, paused}),
    dispose,
  }))
  owner.conversation.submit()
  expect(startSpeechTurn).not.toHaveBeenCalled()
  owner.conversation.toggle()
  await flush()
  owner.conversation.submit()
  owner.conversation.submit()
  await flush()
  expect(stop).toHaveBeenCalledOnce()
  expect(owner.conversation.state()).toBe('transcribing')
  expect(owner.conversation.active()).toBe(true)
  expect(onSend).not.toHaveBeenCalled()
  recognition.resolve('끝까지 들은 말')
  await flush()
  expect(onSend).toHaveBeenCalledExactlyOnceWith('끝까지 들은 말')
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  answer.resolve()
  await flush()
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  const next = turn()
  setPaused(false)
  await flush()
  expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  expect(owner.conversation.active()).toBe(true)
  owner.dispose()
  next.resolve(new Float32Array())
})

it('should submit a completed utterance once and listen again only after generation and readout finish', async () => {
  const audio = turn()
  const answer = Promise.withResolvers<void>()
  const [paused, setPaused] = createSignal(false)
  const onSend = vi.fn().mockImplementation(() => {
    setPaused(true)
    return answer.promise
  })
  vi.mocked(transcribeAudio).mockResolvedValue('안녕')
  const owner = createRoot((dispose) => ({
    conversation: useVoiceConversation({onSend, paused}),
    dispose,
  }))
  owner.conversation.toggle()
  await flush()
  expect(owner.conversation.state()).toBe('recording')
  audio.resolve(new Float32Array([0.1]))
  await flush()
  expect(onSend).toHaveBeenCalledExactlyOnceWith('안녕')
  expect(owner.conversation.state()).toBe('waiting')
  answer.resolve()
  await flush()
  expect(startSpeechTurn).toHaveBeenCalledTimes(1)
  const next = turn()
  setPaused(false)
  await flush()
  expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  expect(owner.conversation.state()).toBe('recording')
  owner.conversation.toggle()
  next.resolve(new Float32Array([0.1]))
  await flush()
  expect(owner.conversation.active()).toBe(false)
  expect(onSend).toHaveBeenCalledOnce()
  owner.dispose()
})

it('should cancel pending recognition and never send or restart after turning the mode off', async () => {
  const audio = turn()
  const text = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio).mockReturnValue(text.promise)
  const onSend = vi.fn()
  const owner = createRoot((dispose) => ({conversation: useVoiceConversation({onSend}), dispose}))
  owner.conversation.toggle()
  await flush()
  audio.resolve(new Float32Array([0.1]))
  await flush()
  expect(owner.conversation.state()).toBe('transcribing')
  owner.conversation.toggle()
  expect(vi.mocked(transcribeAudio).mock.calls[0][0].signal.aborted).toBe(true)
  text.resolve('늦게 도착한 문장')
  await flush()
  expect(onSend).not.toHaveBeenCalled()
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  expect(owner.conversation.state()).toBe('idle')
  owner.dispose()
})

it('should quietly keep listening after an empty transcript and reread saved preferences each turn', async () => {
  const audio = turn()
  vi.mocked(transcribeAudio).mockResolvedValue('')
  const onSend = vi.fn()
  const owner = createRoot((dispose) => ({conversation: useVoiceConversation({onSend}), dispose}))
  owner.conversation.toggle()
  await flush()
  const next = turn()
  audio.resolve(new Float32Array([0.1]))
  await flush()
  expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  expect(onSend).not.toHaveBeenCalled()
  expect(vi.mocked(createDictationPreferences).mock.results[0].value.read).toHaveBeenCalledTimes(2)
  expect(owner.conversation.error()).toBeNull()
  owner.dispose()
  next.resolve(new Float32Array())
})

it('should stop on bubble deselection and ignore late microphone levels and audio', async () => {
  const audio = turn()
  const [enabled, setEnabled] = createSignal(true)
  const onSend = vi.fn()
  const owner = createRoot((dispose) => ({
    conversation: useVoiceConversation({enabled, onSend}),
    dispose,
  }))
  owner.conversation.toggle()
  await flush()
  const [signal, onLevel] = vi.mocked(startSpeechTurn).mock.calls[0]
  onLevel?.(0.7)
  expect(owner.conversation.level()).toBe(0.7)
  setEnabled(false)
  onLevel?.(0.9)
  audio.resolve(new Float32Array([0.1]))
  await flush()
  expect(signal.aborted).toBe(true)
  expect(owner.conversation.level()).toBe(0)
  expect(onSend).not.toHaveBeenCalled()
  owner.dispose()
})

it('should stop after a capture failure and allow an explicit retry', async () => {
  vi.mocked(startSpeechTurn).mockRejectedValue(new Error('마이크 권한을 확인해 주세요.'))
  const owner = createRoot((dispose) => ({
    conversation: useVoiceConversation({onSend: vi.fn()}),
    dispose,
  }))
  owner.conversation.toggle()
  await flush()
  expect(owner.conversation.active()).toBe(false)
  expect(owner.conversation.error()).toBe('마이크 권한을 확인해 주세요.')
  const audio = turn()
  owner.conversation.toggle()
  await flush()
  expect(owner.conversation.state()).toBe('recording')
  expect(owner.conversation.error()).toBeNull()
  owner.dispose()
  audio.resolve(new Float32Array())
})
