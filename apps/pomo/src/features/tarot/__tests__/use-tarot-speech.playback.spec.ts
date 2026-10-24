import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useModelAssetManager, useModelDownload} from '../../model-download'
import {createSupertonicClient} from '../../supertonic/client'
import {
  createDialogueAudioPreview,
  generateDialogueAudio,
} from '../../focus-room-dialogue/dialogue-audio-runtime'
import {type TarotSpeechController, useTarotSpeech} from '../use-tarot-speech'
vi.mock('../../model-download', () => ({useModelAssetManager: vi.fn(), useModelDownload: vi.fn()}))
vi.mock('../../supertonic/client', () => ({createSupertonicClient: vi.fn()}))
vi.mock('../../focus-room-dialogue/dialogue-audio-runtime', () => ({
  createDialogueAudioPreview: vi.fn(),
  generateDialogueAudio: vi.fn(),
}))
let speech: TarotSpeechController
let setText: (text: string) => void
let dispose: () => void
const generated = {audioChunks: [], durationMs: 1000, sampleRate: 24000, segments: [], speed: 1.05}
beforeEach(() => {
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = vi.fn(() => 'blob:tarot-voice')
      static override revokeObjectURL = vi.fn()
    },
  )
  vi.mocked(useModelAssetManager).mockReturnValue({
    runAfterModel: vi.fn(),
    runAfterVoiceModel: async (options) => ({status: 'complete', value: await options.task()}),
  })
  vi.mocked(useModelDownload).mockReturnValue({
    cancel: vi.fn(),
    dismissError: vi.fn(),
    dispose: vi.fn(),
    downloads: () => [],
    startImageModel: vi.fn(),
    startTextModel: vi.fn(),
    startVoiceModel: vi.fn(),
    state: () => ({status: 'idle'}),
  })
  vi.mocked(createSupertonicClient).mockReturnValue({
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize: vi.fn().mockResolvedValue({ok: true, value: undefined}),
  })
  vi.mocked(generateDialogueAudio).mockResolvedValue({ok: true, value: generated})
  vi.mocked(createDialogueAudioPreview).mockResolvedValue(new Blob(['voice']))
  createRoot((cleanup) => {
    dispose = cleanup
    const [text, update] = createSignal('')
    setText = update
    speech = useTarotSpeech({locale: () => 'ko', text})
  })
})
afterEach(() => {
  dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
it.each(['generation', 'preview'] as const)(
  'should retain prepared audio without reviving playback after stopping during %s',
  async (phase) => {
    const pendingGeneration =
      Promise.withResolvers<Awaited<ReturnType<typeof generateDialogueAudio>>>()
    const pendingPreview = Promise.withResolvers<Blob>()
    if (phase === 'generation') {
      vi.mocked(generateDialogueAudio).mockReturnValue(pendingGeneration.promise)
    } else {
      vi.mocked(createDialogueAudioPreview).mockReturnValue(pendingPreview.promise)
    }
    speech.setAutoRead(true)
    setText('창을 닫기 전에 준비하기 시작한 해석')
    await vi.waitFor(
      () =>
        expect(
          phase === 'generation' ? generateDialogueAudio : createDialogueAudioPreview,
        ).toHaveBeenCalledOnce(),
      {interval: 1},
    )
    speech.onPlaybackEnd()
    expect(speech.paused()).toBe(true)
    pendingGeneration.resolve({ok: true, value: generated})
    pendingPreview.resolve(new Blob(['voice']))
    await vi.waitFor(() => expect(speech.status()).toBe('ready'), {interval: 1})
    expect(speech.audioUrl()).toBe('blob:tarot-voice')
    expect(speech.autoplay()).toBe(false)
    expect(speech.paused()).toBe(true)
    expect(generateDialogueAudio).toHaveBeenCalledOnce()
    await speech.request()
    expect(speech.autoplay()).toBe(true)
    expect(generateDialogueAudio).toHaveBeenCalledOnce()
    expect(createDialogueAudioPreview).toHaveBeenCalledOnce()
  },
)

it('should preserve stopped playback when a consented voice download completes late', async () => {
  const download = Promise.withResolvers<{status: 'complete'}>()
  let available = false
  vi.spyOn(useModelAssetManager(), 'runAfterVoiceModel').mockImplementation(async (options) =>
    available ? {status: 'complete', value: await options.task()} : {status: 'missing'},
  )
  vi.mocked(useModelDownload().startVoiceModel).mockImplementation(() => download.promise)
  speech.setAutoRead(true)
  setText('다운로드를 기다리는 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('consent'), {interval: 1})
  const preparing = speech.startDownload()
  expect(speech.status()).toBe('downloading')
  speech.onPlaybackEnd()
  available = true
  download.resolve({status: 'complete'})
  await preparing
  expect(speech.status()).toBe('ready')
  expect(speech.autoplay()).toBe(false)
  expect(speech.audioUrl()).toBe('blob:tarot-voice')
  expect(useModelDownload().cancel).not.toHaveBeenCalled()
  await speech.request()
  expect(speech.autoplay()).toBe(true)
  expect(generateDialogueAudio).toHaveBeenCalledOnce()
})

it.each([1, 10, 50])(
  'should bound retained audio and generation through %s stop and reopen requests',
  async (repetitions) => {
    speech.setAutoRead(true)
    setText('반복 재사용할 같은 해석')
    await vi.waitFor(() => expect(speech.status()).toBe('ready'), {interval: 1})
    const source = speech.audioUrl()
    await Array.from({length: repetitions}).reduce(async (previous) => {
      await previous
      speech.onPlaybackEnd()
      expect(speech.autoplay()).toBe(false)
      await speech.request()
      expect(speech.audioUrl()).toBe(source)
      expect(speech.autoplay()).toBe(true)
    }, Promise.resolve())
    expect(generateDialogueAudio).toHaveBeenCalledOnce()
    expect(createDialogueAudioPreview).toHaveBeenCalledOnce()
    expect(vi.mocked(createSupertonicClient).mock.results[0]!.value.dispose).toHaveBeenCalledOnce()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    dispose()
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(source)
  },
)
