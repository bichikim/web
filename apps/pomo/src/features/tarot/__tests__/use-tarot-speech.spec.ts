import {createEffect, createRoot, createSignal, untrack} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type ModelAssetManager, useModelAssetManager} from '../../model-download'
import {createSupertonicClient} from '../../supertonic/client'
import {
  createDialogueAudioPreview,
  generateDialogueAudio,
} from '../../focus-room-dialogue/dialogue-audio-runtime'
import {type TarotSpeechController, useTarotSpeech} from '../use-tarot-speech'

vi.mock('../../model-download', () => ({useModelAssetManager: vi.fn()}))
vi.mock('../../supertonic/client', () => ({createSupertonicClient: vi.fn()}))
vi.mock('../../focus-room-dialogue/dialogue-audio-runtime', () => ({
  createDialogueAudioPreview: vi.fn(),
  generateDialogueAudio: vi.fn(),
}))

let dispose: () => void
let speech: TarotSpeechController
let setText: (text: string) => void
const disposeClient = vi.fn()
const initialize = vi.fn()
const generated = {audioChunks: [], durationMs: 1000, sampleRate: 24000, segments: [], speed: 1.05}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = vi.fn(() => 'blob:tarot-voice')
      static override revokeObjectURL = vi.fn()
    },
  )
  initialize.mockResolvedValue({ok: true, value: undefined})
  vi.mocked(createSupertonicClient).mockReturnValue({
    cancelGeneration: vi.fn(),
    dispose: disposeClient,
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize,
  })
  const assets: ModelAssetManager = {
    runAfterModel: vi.fn(),
    runAfterVoiceModel: async (options) => ({
      status: 'complete',
      value: await options.task(),
    }),
  }
  vi.spyOn(assets, 'runAfterVoiceModel')
  vi.mocked(useModelAssetManager).mockReturnValue(assets)
  vi.mocked(generateDialogueAudio).mockResolvedValue({ok: true, value: generated})
  vi.mocked(createDialogueAudioPreview).mockResolvedValue(new Blob(['voice']))
  createRoot((cleanup) => {
    dispose = cleanup
    const [text, updateText] = createSignal('')
    setText = updateText
    speech = useTarotSpeech({locale: () => 'ko', text})
  })
})
afterEach(() => {
  dispose()
  vi.unstubAllGlobals()
})

it('should prepare final text with the dialogue defaults without playing automatically', async () => {
  expect(generateDialogueAudio).not.toHaveBeenCalled()
  setText('완성된 카드 해석')
  await vi.waitFor(() => expect(speech.audioUrl()).toBe('blob:tarot-voice'))
  expect(generateDialogueAudio).toHaveBeenCalledWith(
    expect.objectContaining({
      language: 'ko',
      modelId: 'full',
      text: '완성된 카드 해석',
      voiceId: 'Yuna',
    }),
  )
  expect(useModelAssetManager().runAfterVoiceModel).toHaveBeenCalledWith(
    expect.objectContaining({
      downloadIfMissing: false,
      modelId: 'full',
    }),
  )
  expect(speech.autoplay()).toBe(false)
  expect(speech.status()).toBe('ready')
  expect(disposeClient).toHaveBeenCalledOnce()
})

it('should allow automatic playback and pause after playback ends', async () => {
  speech.setAutoRead(true)
  setText('자동으로 읽을 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('ready'))
  expect(speech.autoplay()).toBe(true)
  speech.onPlaybackStart()
  expect(speech.status()).toBe('playing')
  speech.onPlaybackEnd()
  expect(speech.status()).toBe('ready')
  expect(speech.paused()).toBe(true)
  expect(speech.onPlaybackRequest()).toBe(true)
  expect(speech.paused()).toBe(false)
})

it('should publish prepared audio with playback enabled for the mounting player', async () => {
  const observed = vi.fn()
  const cleanup = createRoot((dispose) => {
    createEffect(() => {
      const source = speech.audioUrl()
      if (source !== null) {
        observed(source, untrack(speech.paused))
      }
    })
    return dispose
  })
  try {
    speech.setAutoRead(true)
    setText('완성되면 바로 읽을 해석')
    await vi.waitFor(() => expect(observed).toHaveBeenCalled())
    expect(observed).toHaveBeenCalledExactlyOnceWith('blob:tarot-voice', false)
  } finally {
    cleanup()
  }
})

it('should discard a late generation and release audio when the reading changes', async () => {
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof generateDialogueAudio>>>()
  vi.mocked(generateDialogueAudio).mockReturnValue(pending.promise)
  setText('이전 해석')
  await vi.waitFor(() => expect(generateDialogueAudio).toHaveBeenCalledOnce())
  setText('')
  expect(speech.status()).toBe('idle')
  pending.resolve({ok: true, value: generated})
  await Promise.resolve()
  await Promise.resolve()
  expect(speech.audioUrl()).toBe(null)
  expect(createDialogueAudioPreview).not.toHaveBeenCalled()
  expect(disposeClient).toHaveBeenCalledOnce()
})

it('should expose voice failures without keeping a pending playback request', async () => {
  vi.mocked(generateDialogueAudio).mockResolvedValue({message: '음성 생성 실패', ok: false})
  setText('해석은 유지됨')
  await vi.waitFor(() => expect(speech.status()).toBe('error'))
  expect(speech.error()).toBe('음성 생성 실패')
  expect(speech.audioUrl()).toBe(null)
  expect(disposeClient).toHaveBeenCalledOnce()
})

it('should keep prepared audio available after an automatic playback rejection', async () => {
  speech.setAutoRead(true)
  setText('읽을 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('ready'))
  speech.onPlaybackError()
  expect(speech.audioUrl()).toBe('blob:tarot-voice')
  expect(speech.status()).toBe('ready')
  expect(speech.paused()).toBe(true)
  dispose()
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:tarot-voice')
})
