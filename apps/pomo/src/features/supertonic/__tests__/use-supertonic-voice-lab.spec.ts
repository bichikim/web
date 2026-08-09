import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {
  failureResult,
  successResult,
  type SupertonicVoiceLabClient,
  type SupertonicVoiceLabController,
  type SupertonicVoiceLabRuntime,
  useSupertonicVoiceLab,
} from '../index'

const SAMPLE_RATE = 24_000
const GENERATION_TIME = 1_200

interface VoiceLabTestRoot {
  readonly controller: SupertonicVoiceLabController
  readonly dispose: () => void
}

const createDeferred = () => {
  let resolvePromise: () => void = () => undefined
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })

  return {promise, resolve: resolvePromise}
}

const createAudio = () => ({
  generationTime: GENERATION_TIME,
  sampleRate: SAMPLE_RATE,
  samples: Float32Array.of(0),
})

const createClient = (): SupertonicVoiceLabClient => ({
  dispose: vi.fn(),
  generate: vi.fn(async () => successResult(createAudio())),
  initialize: vi.fn(async (options) => {
    options.onProgress({fileName: '모델', loadedBytes: 1, totalBytes: 2})
    return successResult(undefined)
  }),
})

const createRuntime = (
  clients: ReadonlyArray<SupertonicVoiceLabClient>,
): SupertonicVoiceLabRuntime & {
  readonly createAudioUrl: ReturnType<typeof vi.fn>
  readonly revokeAudioUrl: ReturnType<typeof vi.fn>
} => {
  let clientIndex = 0
  let audioIndex = 0
  const createAudioUrl = vi.fn(() => {
    audioIndex += 1
    return `blob:voice-${audioIndex}`
  })
  const revokeAudioUrl = vi.fn()

  return {
    createAudioUrl,
    createClient: () => {
      const client = clients[clientIndex]

      if (client === undefined) {
        throw new Error('테스트 클라이언트가 부족합니다.')
      }

      clientIndex += 1
      return client
    },
    revokeAudioUrl,
  }
}

const createVoiceLabRoot = (runtime: SupertonicVoiceLabRuntime): VoiceLabTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useSupertonicVoiceLab({initialText: '테스트 문장', runtime})
  })

  return {controller, dispose: disposeRoot}
}

describe('useSupertonicVoiceLab', () => {
  it('should prepare and generate audio with the selected model and voice', async () => {
    const client = createClient()
    const runtime = createRuntime([client])
    const voiceLab = createVoiceLabRoot(runtime)

    voiceLab.controller.selectModel('int8')
    voiceLab.controller.selectVoice('M3')
    await voiceLab.controller.prepare()
    expect(voiceLab.controller.progress()).toBe(100)
    expect(voiceLab.controller.canGenerate()).toBe(true)
    await voiceLab.controller.generate()

    expect(client.initialize).toHaveBeenCalledWith(expect.objectContaining({modelId: 'int8'}))
    expect(client.generate).toHaveBeenCalledWith({text: '테스트 문장', voiceId: 'M3'})
    expect(voiceLab.controller.state().status).toBe('complete')
    expect(voiceLab.controller.results()).toEqual([
      {generationTime: GENERATION_TIME, modelId: 'int8', url: 'blob:voice-1'},
    ])

    voiceLab.dispose()
    expect(runtime.revokeAudioUrl).toHaveBeenCalledWith('blob:voice-1')
  })

  it('should preserve generated results while replacing the active model session', async () => {
    const fullClient = createClient()
    const int8Client = createClient()
    const runtime = createRuntime([fullClient, int8Client])
    const voiceLab = createVoiceLabRoot(runtime)

    await voiceLab.controller.prepare()
    await voiceLab.controller.generate()
    voiceLab.controller.selectModel('int8')
    await voiceLab.controller.prepare()
    await voiceLab.controller.generate()

    expect(fullClient.dispose).toHaveBeenCalledTimes(1)
    expect(voiceLab.controller.results().map((result) => result.modelId)).toEqual(['full', 'int8'])

    voiceLab.dispose()
    expect(int8Client.dispose).toHaveBeenCalledTimes(1)
  })

  it('should expose preparation failures without marking the model ready', async () => {
    const client = createClient()
    vi.mocked(client.initialize).mockResolvedValueOnce(
      failureResult({
        backend: 'wasm',
        code: 'backend-failed',
        detail: '준비 실패',
        phase: 'initialize',
        retryable: false,
      }),
    )
    const voiceLab = createVoiceLabRoot(createRuntime([client]))

    await voiceLab.controller.prepare()

    expect(voiceLab.controller.state().status).toBe('error')
    expect(voiceLab.controller.errorMessage()).toBe('WASM 음성 엔진을 준비하지 못했어요.')
    expect(voiceLab.controller.isModelReady()).toBe(false)
    voiceLab.dispose()
  })

  it('should ignore generation before preparation and expose generation failures after preparation', async () => {
    const client = createClient()
    vi.mocked(client.generate).mockResolvedValueOnce(
      failureResult({
        code: 'worker-failed',
        detail: '생성 실패',
        phase: 'generate',
        retryable: true,
      }),
    )
    const voiceLab = createVoiceLabRoot(createRuntime([client]))

    await voiceLab.controller.generate()
    expect(client.generate).not.toHaveBeenCalled()

    await voiceLab.controller.prepare()
    await voiceLab.controller.generate()

    expect(voiceLab.controller.state().status).toBe('error')
    expect(voiceLab.controller.errorMessage()).toBe('Supertonic 음성 엔진을 실행하지 못했어요.')
    expect(voiceLab.controller.isModelReady()).toBe(true)
    voiceLab.dispose()
  })

  it('should revoke the previous URL when regenerating with the same model', async () => {
    const client = createClient()
    const runtime = createRuntime([client])
    const voiceLab = createVoiceLabRoot(runtime)

    await voiceLab.controller.prepare()
    await voiceLab.controller.generate()
    await voiceLab.controller.generate()

    expect(voiceLab.controller.results()).toHaveLength(1)
    expect(runtime.revokeAudioUrl).toHaveBeenCalledWith('blob:voice-1')
    voiceLab.dispose()
  })

  it('should report preparation status and ignore duplicate preparation while busy', async () => {
    const preparation = createDeferred()
    const client = createClient()
    vi.mocked(client.initialize).mockImplementationOnce(async (options) => {
      options.onStatus('ONNX 세션을 준비하고 있어요.')
      await preparation.promise
      return successResult(undefined)
    })
    const voiceLab = createVoiceLabRoot(createRuntime([client]))

    const firstPreparation = voiceLab.controller.prepare()
    await voiceLab.controller.prepare()

    expect(client.initialize).toHaveBeenCalledTimes(1)
    expect(voiceLab.controller.isBusy()).toBe(true)
    expect(voiceLab.controller.canPrepare()).toBe(false)
    expect(voiceLab.controller.statusMessage()).toBe('ONNX 세션을 준비하고 있어요.')

    preparation.resolve()
    await firstPreparation
    expect(voiceLab.controller.state().status).toBe('ready')
    voiceLab.dispose()
  })

  it('should ignore stale preparation callbacks after switching models', async () => {
    const preparation = createDeferred()
    const client = createClient()
    let reportProgress: () => void = () => undefined
    let reportStatus: (message: string) => void = () => undefined
    vi.mocked(client.initialize).mockImplementationOnce(async (options) => {
      reportProgress = () =>
        options.onProgress({fileName: '이전 모델', loadedBytes: 9, totalBytes: 10})
      reportStatus = options.onStatus
      await preparation.promise
      return successResult(undefined)
    })
    const voiceLab = createVoiceLabRoot(createRuntime([client]))

    const pendingPreparation = voiceLab.controller.prepare()
    voiceLab.controller.selectModel('int8')
    reportProgress()
    reportStatus('이 메시지는 무시해야 해요.')
    preparation.resolve()
    await pendingPreparation

    expect(client.dispose).toHaveBeenCalledTimes(1)
    expect(voiceLab.controller.selectedModelId()).toBe('int8')
    expect(voiceLab.controller.state()).toEqual({
      message: 'INT8 모델을 준비해 비교할 수 있어요.',
      status: 'unprepared',
    })
    expect(voiceLab.controller.progress()).toBe(0)
    voiceLab.dispose()
  })

  it('should contain unexpected initialization rejections at the UI boundary', async () => {
    const client = createClient()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(client.initialize).mockRejectedValueOnce(new Error('계약 밖 초기화 오류'))
    const voiceLab = createVoiceLabRoot(createRuntime([client]))

    await voiceLab.controller.prepare()

    expect(voiceLab.controller.errorMessage()).toBe(
      '모델을 준비하는 중 예상하지 못한 문제가 발생했어요.',
    )
    expect(consoleError).toHaveBeenCalledWith('Unexpected Supertonic failure', expect.any(Error))
    voiceLab.dispose()
    consoleError.mockRestore()
  })

  it('should contain unexpected generation rejections at the UI boundary', async () => {
    const client = createClient()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(client.generate).mockRejectedValueOnce(new Error('계약 밖 생성 오류'))
    const voiceLab = createVoiceLabRoot(createRuntime([client]))

    await voiceLab.controller.prepare()
    await voiceLab.controller.generate()

    expect(voiceLab.controller.errorMessage()).toBe(
      '음성을 생성하는 중 예상하지 못한 문제가 발생했어요.',
    )
    expect(voiceLab.controller.isModelReady()).toBe(true)
    expect(consoleError).toHaveBeenCalledWith('Unexpected Supertonic failure', expect.any(Error))
    voiceLab.dispose()
    consoleError.mockRestore()
  })
})
