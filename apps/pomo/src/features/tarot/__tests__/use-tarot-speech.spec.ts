import {createEffect, createRoot, createSignal, onCleanup, untrack} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  createModelAssetManager,
  createModelDownloadController,
  type ModelAssetManager,
  type ModelDownloadController,
  type ModelDownloadResult,
  type RunAfterModelResult,
  type RunAfterVoiceModelOptions,
  useModelAssetManager,
  useModelDownload,
} from '../../model-download'
import {createSupertonicClient} from '../../supertonic/client'
import {
  createDialogueAudioPreview,
  generateDialogueAudio,
} from '../../focus-room-dialogue/dialogue-audio-runtime'
import {type TarotSpeechController, useTarotSpeech} from '../use-tarot-speech'

vi.mock('../../model-download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../model-download')>()
  return {
    ...actual,
    useModelAssetManager: vi.fn(),
    useModelDownload: vi.fn(),
  }
})
vi.mock('../../supertonic/client', () => ({createSupertonicClient: vi.fn()}))
vi.mock('../../focus-room-dialogue/dialogue-audio-runtime', () => ({
  createDialogueAudioPreview: vi.fn(),
  generateDialogueAudio: vi.fn(),
}))

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

let dispose: () => void
let speech: TarotSpeechController
let setText: (text: string) => void
let setLocale: (locale: 'en' | 'ko') => void
const disposeClient = vi.fn()
const initialize = vi.fn()
const cancelDownload = vi.fn<ModelDownloadController['cancel']>()
const startVoiceModel = vi.fn<ModelDownloadController['startVoiceModel']>()
const voiceDownloads = vi.fn<ModelDownloadController['downloads']>(() => [])
const generated = {audioChunks: [], durationMs: 1000, sampleRate: 24000, segments: [], speed: 1.05}
let voiceDownloaded = true
let assets: ModelAssetManager

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
  voiceDownloaded = true
  cancelDownload.mockReset()
  startVoiceModel.mockReset().mockImplementation(async () => {
    voiceDownloaded = true
    return {status: 'complete'}
  })
  voiceDownloads.mockReset().mockReturnValue([])
  vi.mocked(createSupertonicClient).mockReturnValue({
    cancelGeneration: vi.fn(),
    dispose: disposeClient,
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize,
  })
  assets = {
    runAfterModel: vi.fn(),
    runAfterVoiceModel: vi.fn(async (options) =>
      voiceDownloaded
        ? {status: 'complete' as const, value: await options.task()}
        : {status: 'missing' as const},
    ),
  }
  vi.mocked(useModelAssetManager).mockReturnValue(assets)
  vi.mocked(useModelDownload).mockReturnValue({
    cancel: cancelDownload,
    dismissError: vi.fn(),
    dispose: vi.fn(),
    downloads: voiceDownloads,
    startImageModel: vi.fn(),
    startTextModel: vi.fn(),
    startVoiceModel,
    state: () => ({status: 'idle'}),
  })
  vi.mocked(generateDialogueAudio).mockResolvedValue({ok: true, value: generated})
  vi.mocked(createDialogueAudioPreview).mockResolvedValue(new Blob(['voice']))
  createRoot((cleanup) => {
    dispose = cleanup
    const [text, updateText] = createSignal('')
    const [locale, updateLocale] = createSignal<'en' | 'ko'>('ko')
    setText = updateText
    setLocale = updateLocale
    speech = useTarotSpeech({locale, text})
  })
})
afterEach(() => {
  dispose()
  vi.unstubAllGlobals()
})

it('should prepare final text with the dialogue defaults without playing automatically', async () => {
  expect(generateDialogueAudio).not.toHaveBeenCalled()
  expect(speech.autoRead()).toBe(false)
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

it('should allow text-only reading without voice consent when auto-read is off', async () => {
  voiceDownloaded = false
  setText('완성된 카드 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('idle'))

  expect(speech.autoRead()).toBe(false)
  expect(speech.error()).toBe(null)
  expect(startVoiceModel).not.toHaveBeenCalled()
  expect(generateDialogueAudio).not.toHaveBeenCalled()

  speech.request()
  await vi.waitFor(() => expect(speech.status()).toBe('consent'))
  expect(startVoiceModel).not.toHaveBeenCalled()
})

it('should download voice after play consent and prepare the requested reading', async () => {
  voiceDownloaded = false
  setText('완성된 카드 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('idle'))
  speech.request()
  await vi.waitFor(() => expect(speech.status()).toBe('consent'))

  await speech.startDownload()
  await vi.waitFor(() => expect(speech.status()).toBe('ready'))

  expect(startVoiceModel).toHaveBeenCalledExactlyOnceWith('full')
  expect(generateDialogueAudio).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({text: '완성된 카드 해석'}),
  )
  expect(speech.autoplay()).toBe(true)
})

it('should ask for voice consent when automatic reading is enabled', async () => {
  voiceDownloaded = false
  speech.setAutoRead(true)
  setText('자동으로 읽을 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('consent'))

  expect(startVoiceModel).not.toHaveBeenCalled()
  await speech.startDownload()
  await vi.waitFor(() => expect(speech.status()).toBe('ready'))
  expect(speech.autoplay()).toBe(true)
})

it('should keep the consented voice download visible when the reading changes', async () => {
  const download = Promise.withResolvers<ModelDownloadResult>()
  voiceDownloaded = false
  startVoiceModel.mockReturnValue(download.promise)
  setText('이전 해석')
  await flush()
  speech.request()
  await vi.waitFor(() => expect(speech.status()).toBe('consent'))

  voiceDownloads.mockReturnValue([
    {
      label: 'Supertonic 음성',
      percentage: 38,
      status: 'loading',
      target: {kind: 'voice', modelId: 'full'},
    },
  ])
  const pending = speech.startDownload()
  await vi.waitFor(() => expect(speech.status()).toBe('downloading'))
  expect(speech.progress()).toBe(38)

  setText('새 해석')
  await flush()
  expect(speech.status()).toBe('downloading')
  expect(speech.progress()).toBe(38)

  download.resolve({status: 'complete'})
  await pending
  expect(speech.status()).toBe('idle')
  expect(generateDialogueAudio).not.toHaveBeenCalled()
})

it('should prepare the latest automatic reading after a shared voice download completes', async () => {
  const download = Promise.withResolvers<ModelDownloadResult>()
  voiceDownloaded = false
  startVoiceModel.mockImplementation(() => {
    voiceDownloads.mockReturnValue([
      {
        label: 'Supertonic 음성',
        percentage: 38,
        status: 'loading',
        target: {kind: 'voice', modelId: 'full'},
      },
    ])
    return download.promise
  })
  speech.setAutoRead(true)
  setText('이전 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('consent'))

  const pending = speech.startDownload()
  await vi.waitFor(() => expect(speech.status()).toBe('downloading'))
  setText('새 해석')
  await flush()
  voiceDownloaded = true
  download.resolve({status: 'complete'})
  await pending
  await vi.waitFor(() => expect(speech.status()).toBe('ready'))

  expect(generateDialogueAudio).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({text: '새 해석'}),
  )
  expect(speech.autoplay()).toBe(true)
})

it('should keep the latest reading current when an older voice check finishes late', async () => {
  voiceDownloaded = false
  const olderCheck = Promise.withResolvers<{readonly status: 'missing'}>()
  const firstStarted = Promise.withResolvers<void>()
  const secondStarted = Promise.withResolvers<void>()
  let checks = 0
  const runAfterVoiceModel = async <Value>(
    options: RunAfterVoiceModelOptions<Value>,
  ): Promise<RunAfterModelResult<Value>> => {
    checks += 1
    if (checks === 1) {
      firstStarted.resolve()
      return olderCheck.promise
    }
    if (checks === 2) {
      secondStarted.resolve()
    }
    return voiceDownloaded ? {status: 'complete', value: await options.task()} : {status: 'missing'}
  }
  vi.mocked(assets.runAfterVoiceModel).mockImplementation(runAfterVoiceModel)
  speech.setAutoRead(true)
  setText('이전 해석')
  await firstStarted.promise
  setText('현재 해석')
  await secondStarted.promise
  await flush()
  expect(speech.status()).toBe('consent')

  olderCheck.resolve({status: 'missing'})
  await flush()
  await speech.startDownload()

  expect(speech.status()).toBe('ready')
  expect(generateDialogueAudio).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({text: '현재 해석'}),
  )
})

it('should cancel the shared voice download only when the user cancels it', async () => {
  const download = Promise.withResolvers<ModelDownloadResult>()
  voiceDownloaded = false
  startVoiceModel.mockReturnValue(download.promise)
  setText('완성된 카드 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('idle'))
  speech.request()
  await vi.waitFor(() => expect(speech.status()).toBe('consent'))
  const pending = speech.startDownload()
  await vi.waitFor(() => expect(speech.status()).toBe('downloading'))

  speech.cancelDownload()
  expect(cancelDownload).toHaveBeenCalledExactlyOnceWith({kind: 'voice', modelId: 'full'})
  expect(speech.status()).toBe('idle')
  download.resolve({status: 'complete'})
  await pending
  expect(generateDialogueAudio).not.toHaveBeenCalled()
})

it('should leave a shared voice download running when the speech owner is disposed', async () => {
  const voice = Promise.withResolvers<{ok: true; value: void}>()
  const initialize = vi.fn(() => voice.promise)
  const createVoiceClient = vi.fn(() => ({
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize,
  }))
  const createTextClient = vi.fn(() => ({dispose: vi.fn(), prepare: vi.fn()}))
  let disposeProvider: () => void = () => undefined
  const controller = createRoot((cleanup) => {
    disposeProvider = cleanup
    const download = createModelDownloadController({createTextClient, createVoiceClient})
    onCleanup(download.dispose)
    return download
  })
  const assetManager = createModelAssetManager({
    controller,
    isModelDownloaded: async () => false,
  })
  vi.mocked(useModelAssetManager).mockReturnValue(assetManager)
  vi.mocked(useModelDownload).mockReturnValue(controller)
  dispose()
  createRoot((cleanup) => {
    dispose = cleanup
    const [text, updateText] = createSignal('')
    setText = updateText
    speech = useTarotSpeech({locale: () => 'ko', text})
  })

  speech.setAutoRead(true)
  setText('자동으로 읽을 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('consent'))
  const pending = speech.startDownload()
  expect(controller.downloads().map((item) => item.status)).toEqual(['loading'])
  expect(createVoiceClient).toHaveBeenCalledOnce()
  expect(initialize).toHaveBeenCalledWith(expect.objectContaining({modelId: 'full'}))

  dispose()
  voice.resolve({ok: true, value: undefined})
  await pending

  expect(controller.downloads()).toEqual([])
  expect(generateDialogueAudio).not.toHaveBeenCalled()
  disposeProvider()
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

it('should reuse prepared audio when automatic reading is switched off and on', async () => {
  speech.setAutoRead(true)
  setText('같은 해석을 다시 읽기')
  await vi.waitFor(() => expect(speech.status()).toBe('ready'))
  const source = speech.audioUrl()
  speech.onPlaybackStart()

  speech.setAutoRead(false)
  expect(speech.audioUrl()).toBe(source)
  expect(speech.status()).toBe('ready')
  expect(speech.paused()).toBe(true)
  expect(speech.autoplay()).toBe(false)

  speech.setAutoRead(true)
  await flush()
  expect(speech.audioUrl()).toBe(source)
  expect(speech.autoplay()).toBe(true)
  expect(generateDialogueAudio).toHaveBeenCalledOnce()
  expect(createDialogueAudioPreview).toHaveBeenCalledOnce()
  expect(URL.createObjectURL).toHaveBeenCalledOnce()
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
})

it('should share pending generation across auto-read changes and honor the latest playback choice', async () => {
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof generateDialogueAudio>>>()
  vi.mocked(generateDialogueAudio).mockReturnValue(pending.promise)
  setText('아직 음성을 만드는 해석')
  await vi.waitFor(() => expect(generateDialogueAudio).toHaveBeenCalledOnce())

  speech.setAutoRead(true)
  speech.setAutoRead(false)
  await flush()
  expect(generateDialogueAudio).toHaveBeenCalledOnce()
  expect(speech.status()).toBe('preparing')
  expect(disposeClient).not.toHaveBeenCalled()
  pending.resolve({ok: true, value: generated})
  await vi.waitFor(() => expect(speech.status()).toBe('ready'))
  expect(speech.paused()).toBe(true)
  expect(speech.autoplay()).toBe(false)

  speech.setAutoRead(true)
  await flush()
  expect(speech.autoplay()).toBe(true)
  expect(generateDialogueAudio).toHaveBeenCalledOnce()
})

it('should reuse the prepared recording when manually requesting playback again', async () => {
  setText('이미 준비된 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('ready'))
  speech.onPlaybackEnd()
  speech.request()
  await flush()

  expect(speech.paused()).toBe(false)
  expect(speech.autoplay()).toBe(true)
  expect(generateDialogueAudio).toHaveBeenCalledOnce()
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
})

it('should regenerate only when the reading text or language changes', async () => {
  setText('이전 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('ready'), {interval: 5})
  setText('새 해석')
  await vi.waitFor(() => expect(speech.status()).toBe('ready'), {interval: 5})
  expect(generateDialogueAudio).toHaveBeenCalledTimes(2)
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)

  setLocale('en')
  await vi.waitFor(() => expect(speech.status()).toBe('ready'), {interval: 5})
  expect(generateDialogueAudio).toHaveBeenCalledTimes(3)
  expect(generateDialogueAudio).toHaveBeenLastCalledWith(
    expect.objectContaining({language: 'en', text: '새 해석'}),
  )
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
})
