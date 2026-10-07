/** @vitest-environment jsdom */
import {describe, expect, it, vi} from 'vitest'
import type {ModelAssets} from '../model-assets'
import type {SupertonicWorkerInput} from '../messages'
import {
  assetMocks,
  audioMocks,
  currentEngine,
  engineMocks,
  failure,
  fullModel,
  generateMessage,
  initializationAssets,
  initialize,
  jsonResponse,
  loadWorker,
  modelAssets,
  modelResource,
  runtime,
  runtimeMocks,
  storageMocks,
  success,
  textMocks,
  validationError,
  voice,
} from './fixtures/generation'

describe('generation', () => {
  it('should reject generation before a model is ready and ignore idle cancellation', async () => {
    const worker = await loadWorker()

    await worker.dispatch({type: 'cancel-generation'})
    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'model-not-ready', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should generate and transfer custom-voice audio in ordered chunks', async () => {
    textMocks.split.mockReturnValue(['첫 문장', '둘째 문장'])
    currentEngine.generate
      .mockImplementationOnce(
        async (options: {onProgress: (step: number, total: number) => void}) => {
          options.onProgress(1, 2)
          return Float32Array.of(1)
        },
      )
      .mockResolvedValueOnce(Float32Array.of(2))
    const joined = Float32Array.of(1, 0, 2)
    audioMocks.join.mockReturnValue(joined)
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage())

    expect(currentEngine.generate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({language: 'ko', speed: 1, text: '첫 문장', voice}),
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {message: '음성 1/2 다듬는 중 1/2', type: 'status'},
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({index: 1, requestId: 7, total: 2, type: 'chunk'}),
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        generationTime: 0,
        requestId: 7,
        sampleRate: 24_000,
        samples: joined,
        type: 'result',
      },
      [joined.buffer],
    )
  })

  it('should normalize each chunk only at the speech-engine boundary', async () => {
    textMocks.split.mockReturnValue([
      '사과 3개가 있어요.',
      '2026년 계획이에요.',
      '인증번호는 4821입니다.',
    ])
    const worker = await loadWorker()
    await initialize(worker)

    await worker.dispatch(generateMessage())

    expect(textMocks.split).toHaveBeenCalledWith('안녕하세요.', fullModel.speechPolicy)
    expect(currentEngine.generate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({text: '사과 세 개가 있어요.'}),
    )
    expect(currentEngine.generate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({text: '이천이십육 년 계획이에요.'}),
    )
    expect(currentEngine.generate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({text: '인증번호는 사 팔 이 일입니다.'}),
    )
  })

  it('should pronounce leading-zero English verification codes as individual digits', async () => {
    const worker = await loadWorker()
    await initialize(worker)

    await worker.dispatch(
      generateMessage({language: 'en', text: 'Verification code 004 is ready.'}),
    )

    expect(currentEngine.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'en',
        text: 'Verification code zero zero four is ready.',
      }),
    )
  })

  it('should preserve a chunk when number pronunciation would exceed the model limit', async () => {
    const text = `Verification code ${'0'.repeat(100)} is ready.`
    textMocks.split.mockReturnValue([text])
    const worker = await loadWorker()
    await initialize(worker)

    await worker.dispatch(generateMessage({language: 'en', text}))

    expect(currentEngine.generate).toHaveBeenCalledWith(
      expect.objectContaining({language: 'en', text}),
    )
  })

  it('should fetch and cache a preset voice between generations', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    const message = generateMessage({voice: {id: 'Yuna', kind: 'preset'}})

    await worker.dispatch(message)
    await worker.dispatch({...message, requestId: 8})

    expect(assetMocks.getVoiceUrl).toHaveBeenCalledOnce()
    expect(engineMocks.parseVoice).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({requestId: 8, type: 'result'}),
      expect.any(Array),
    )
  })

  it('should return a preset voice validation failure without caching it', async () => {
    const voiceError = {...validationError, asset: 'voice'} as const
    engineMocks.parseVoice.mockReturnValue(failure(voiceError))
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage({voice: {id: 'Yuna', kind: 'preset'}}))

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {error: voiceError, requestId: 7, type: 'error'},
      [],
    )
  })

  it('should return a preset voice download failure', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      modelResource(
        options.url === 'https://models.test/voice.json' ? jsonResponse({}, 400) : jsonResponse(),
      ),
    )
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage({voice: {id: 'Yuna', kind: 'preset'}}))

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'download-failed',
          fileName: 'Yuna 목소리',
          phase: 'download',
          retryable: false,
          status: 400,
        },
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should reject preset generation when model assets are unavailable', async () => {
    assetMocks.parse.mockReturnValue(
      success({...initializationAssets, modelAssets: null as unknown as ModelAssets}),
    )
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage({voice: {id: 'Yuna', kind: 'preset'}}))

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'model-not-ready', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should reject voice creation when the active runtime is unavailable', async () => {
    runtimeMocks.load.mockResolvedValue(null)
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'model-not-ready', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should stop after a generation cancellation between chunks', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    currentEngine.generate.mockImplementationOnce(async () => {
      await worker.dispatch({type: 'cancel-generation'})
      return Float32Array.of(1)
    })

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'cancelled', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should stop after cancellation once empty chunks are joined', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    textMocks.split.mockImplementation(() => {
      void worker.dispatch({type: 'cancel-generation'})
      return []
    })

    await worker.dispatch(generateMessage())

    expect(audioMocks.join).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({error: expect.objectContaining({code: 'cancelled'})}),
      [],
    )
  })

  it('should serialize unknown engine failures', async () => {
    currentEngine.generate.mockRejectedValue('generation failed')
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'worker-failed',
          detail: '알 수 없는 오류',
          phase: 'generate',
          retryable: true,
        },
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should preserve the latest controller across concurrent generations', async () => {
    let finishFirst: (samples: Float32Array) => void = () => undefined
    currentEngine.generate
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve
        }),
      )
      .mockResolvedValueOnce(Float32Array.of(2))
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    const first = worker.dispatch(generateMessage({requestId: 1}))
    await vi.waitFor(() => expect(currentEngine.generate).toHaveBeenCalledOnce())

    await worker.dispatch(generateMessage({requestId: 2}))
    finishFirst(Float32Array.of(1))
    await first

    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({requestId: 1, type: 'result'}),
      expect.any(Array),
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({requestId: 2, type: 'result'}),
      expect.any(Array),
    )
  })
})
