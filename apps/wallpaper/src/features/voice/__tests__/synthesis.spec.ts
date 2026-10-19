import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {createSynthesis} from '../synthesis'

class ModelWorker extends EventTarget {
  static instances: ModelWorker[] = []
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() {
    super()
    ModelWorker.instances.push(this)
  }
}
afterEach(() => {
  ModelWorker.instances = []
  vi.unstubAllGlobals()
})
it('should cancel obsolete inference, ignore its late output and retain the loaded worker', async () => {
  vi.stubGlobal('Worker', ModelWorker)
  const client = createSynthesis()
  const first = new AbortController()
  const old = client.generate('첫 문장', DEFAULT_POFFO_VOICE, first.signal, {status: vi.fn()})
  const rejected = expect(old).rejects.toMatchObject({name: 'AbortError'})
  first.abort()
  await rejected
  expect(ModelWorker.instances[0].terminate).not.toHaveBeenCalled()
  expect(ModelWorker.instances[0].postMessage).toHaveBeenLastCalledWith({id: 1, type: 'cancel'})
  const next = client.generate('둘째 문장', DEFAULT_POFFO_VOICE, new AbortController().signal, {
    status: vi.fn(),
  })
  const samples = Float32Array.of(0.1, 0.2)
  ModelWorker.instances[0].dispatchEvent(
    new MessageEvent('message', {data: {id: 1, message: 'stale', type: 'error'}}),
  )
  expect(ModelWorker.instances).toHaveLength(1)
  ModelWorker.instances[0].dispatchEvent(
    new MessageEvent('message', {data: {id: 2, sampleRate: 24_000, samples, type: 'audio'}}),
  )
  await expect(next).resolves.toMatchObject({sampleRate: 24_000, samples})
  client.dispose()
  expect(ModelWorker.instances[0].terminate).toHaveBeenCalledOnce()
})
it('should surface worker errors and reject disposal instead of leaving a generation pending', async () => {
  vi.stubGlobal('Worker', ModelWorker)
  const client = createSynthesis()
  const first = client.generate('내용', DEFAULT_POFFO_VOICE, new AbortController().signal, {
    status: vi.fn(),
  })
  const failed = expect(first).rejects.toThrow('음성 모델을 불러올 수 없어요.')
  ModelWorker.instances[0].dispatchEvent(new Event('messageerror'))
  await failed
  const second = client.generate('재시도', DEFAULT_POFFO_VOICE, new AbortController().signal, {
    status: vi.fn(),
  })
  const cancelled = expect(second).rejects.toMatchObject({name: 'AbortError'})
  client.dispose()
  await cancelled
})

it.each(['int8', 'full'] as const)(
  'should send Pomo-normalized numbers and symbols to the %s model',
  async (model) => {
    vi.stubGlobal('Worker', ModelWorker)
    const client = createSynthesis()
    const generated = client.generate(
      '사과 3개와 진행률 +12.5%',
      {...DEFAULT_POFFO_VOICE, model},
      new AbortController().signal,
      {status: vi.fn()},
    )
    const worker = ModelWorker.instances[0]
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({text: '사과 세 개와 진행률 플러스 십이 점 오 퍼센트'}),
    )
    worker.dispatchEvent(
      new MessageEvent('message', {
        data: {id: 1, sampleRate: 24_000, samples: Float32Array.of(0.1), type: 'audio'},
      }),
    )
    await generated
    client.dispose()
  },
)

it('should preserve text when normalization would exceed the model input limit', async () => {
  vi.stubGlobal('Worker', ModelWorker)
  const client = createSynthesis()
  const text = '12.5% '.repeat(25).trim()
  const generated = client.generate(text, DEFAULT_POFFO_VOICE, new AbortController().signal, {
    status: vi.fn(),
  })
  const worker = ModelWorker.instances[0]
  expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({text}))
  worker.dispatchEvent(
    new MessageEvent('message', {
      data: {id: 1, sampleRate: 24_000, samples: Float32Array.of(0.1), type: 'audio'},
    }),
  )
  await generated
  client.dispose()
})

it('should copy reactive settings into a cloneable worker request', async () => {
  vi.stubGlobal('Worker', ModelWorker)
  const {createStore} = await import('solid-js/store')
  const [voice] = createStore({...DEFAULT_POFFO_VOICE, provider: 'local' as const})
  const client = createSynthesis()
  const generated = client.generate('미리듣기', voice, new AbortController().signal, {
    status: vi.fn(),
  })
  const worker = ModelWorker.instances[0]
  const request = worker.postMessage.mock.calls[0][0]
  expect(() => structuredClone(request)).not.toThrow()
  worker.dispatchEvent(
    new MessageEvent('message', {
      data: {id: 1, sampleRate: 24_000, samples: Float32Array.of(0.1), type: 'audio'},
    }),
  )
  await generated
  client.dispose()
})
it('should clean up a synchronous worker send failure so the next request can retry', async () => {
  vi.stubGlobal('Worker', ModelWorker)
  const client = createSynthesis()
  const first = client.generate('첫 문장', DEFAULT_POFFO_VOICE, new AbortController().signal, {
    status: vi.fn(),
  })
  ModelWorker.instances[0].dispatchEvent(
    new MessageEvent('message', {
      data: {id: 1, sampleRate: 24_000, samples: Float32Array.of(0.1), type: 'audio'},
    }),
  )
  await first
  ModelWorker.instances[0].postMessage.mockImplementationOnce(() => {
    throw new DOMException('Cannot clone', 'DataCloneError')
  })
  await expect(
    client.generate('실패', DEFAULT_POFFO_VOICE, new AbortController().signal, {status: vi.fn()}),
  ).rejects.toMatchObject({name: 'DataCloneError'})
  const next = client.generate('재시도', DEFAULT_POFFO_VOICE, new AbortController().signal, {
    status: vi.fn(),
  })
  const worker = ModelWorker.instances[1]
  worker.dispatchEvent(
    new MessageEvent('message', {
      data: {id: 3, sampleRate: 24_000, samples: Float32Array.of(0.1), type: 'audio'},
    }),
  )
  await next
  client.dispose()
})
