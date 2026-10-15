import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {InferenceSession, Tensor} from 'onnxruntime-web/wasm'
import {LayaWasm, parameterLayout} from '../index'

vi.mock('onnxruntime-web/wasm', async () => {
  const actual =
    await vi.importActual<typeof import('onnxruntime-web/wasm')>('onnxruntime-web/wasm')
  return {...actual, InferenceSession: {create: vi.fn()}}
})
vi.mock('../yield-to-browser', () => ({yieldToBrowser: vi.fn()}))

const width = 2
const parameters = new Float32Array(13).fill(1)
const manifest = {
  config: {head_max_len: 32, max_len: 80, temperature: [1, 1, 1], temperature_by_options: {}},
  externalData: [],
  featureOutput: 'features',
  modelId: 'model',
  parameters: parameterLayout(width),
  version: 1,
  width,
}
const vocabulary = {
  added_tokens: [],
  decoder: null,
  model: {
    continuing_subword_prefix: '##',
    max_input_chars_per_word: 100,
    type: 'WordPiece',
    unk_token: '[UNK]',
    vocab: {'[CLS]': 1, '[MASK]': 3, '[PAD]': 0, '[SEP]': 2, '[UNK]': 4},
  },
  normalizer: null,
  post_processor: null,
  pre_tokenizer: {type: 'Whitespace'},
}
const question = {criteria: ['a', 'b'], instructions: 'pick', type: 'choice'} as const
const example = {question, state: 'hello', target: [1, 0]}
const features = {inputNames: ['input_ids'], release: vi.fn(), run: vi.fn()}
const scorer = {release: vi.fn(), run: vi.fn()}

beforeEach(() => {
  features.run.mockImplementation(async () => ({
    features: new Tensor('float32', new Float32Array(4), [1, 2, 2]),
  }))
  scorer.run.mockImplementation(async () => ({
    logits: new Tensor('float32', Float32Array.of(0, 1), [1, 2]),
  }))
  vi.mocked(InferenceSession.create).mockResolvedValueOnce(features).mockResolvedValueOnce(scorer)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL) => {
      if (url.pathname.endsWith('manifest.json')) {
        return Response.json(manifest)
      }
      if (url.pathname.endsWith('tokenizer.json')) {
        return Response.json(vocabulary)
      }
      if (url.pathname.endsWith('tokenizer_config.json')) {
        return Response.json({})
      }
      return new Response(parameters.slice().buffer)
    }),
  )
})
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

it('should reject invalid target distributions without changing weights', async () => {
  const model = await LayaWasm.load({baseUrl: 'https://example.test/model/'})
  await expect(model.train([{...example, target: [0, 0]}])).rejects.toThrow(/summing to one/)
  expect(model.exportCheckpoint().parameters).toEqual(parameters)
  expect(scorer.run).not.toHaveBeenCalled()
  await model.close()
})

it('should reject overlapping work and allow the next call after completion', async () => {
  const model = await LayaWasm.load({baseUrl: 'https://example.test/model/'})
  const gate = Promise.withResolvers<Record<string, Tensor>>()
  features.run.mockReturnValueOnce(gate.promise)
  const pending = model.systemOne('hello', {answer: question})
  await expect(model.systemOne('hello', {answer: question})).rejects.toThrow(/active operation/)
  expect(() => model.exportCheckpoint()).toThrow(/active operation/)
  gate.resolve({features: new Tensor('float32', new Float32Array(4), [1, 2, 2])})
  await pending
  expect((await model.systemOne('hello', {answer: question})).answers.answer.choice).toBe('b')
  await model.close()
})

it('should preserve the last weights when the runtime returns a nonfinite update', async () => {
  const model = await LayaWasm.load({baseUrl: 'https://example.test/model/'})
  scorer.run.mockResolvedValueOnce({
    loss: new Tensor('float32', Float32Array.of(1), []),
    next_norm_scale: new Tensor('float32', Float32Array.of(NaN, 1), [2]),
  })
  await expect(model.train([example])).rejects.toThrow(/invalid parameters/)
  expect(model.exportCheckpoint().parameters).toEqual(parameters)
  expect(model.exportCheckpoint().steps).toBe(0)
  await model.close()
})

it('should release loaded features if scorer initialization fails', async () => {
  vi.mocked(InferenceSession.create)
    .mockReset()
    .mockResolvedValueOnce(features)
    .mockRejectedValueOnce(new Error('scorer unavailable'))
  await expect(LayaWasm.load({baseUrl: 'https://example.test/model/'})).rejects.toThrow(
    'scorer unavailable',
  )
  expect(features.release).toHaveBeenCalledOnce()
})

it('should reuse frozen features across epochs while committing every scorer update', async () => {
  const model = await LayaWasm.load({baseUrl: 'https://example.test/model/'})
  let extractions = 0
  const observed: number[] = []
  features.run.mockImplementation(async () => {
    extractions += 1
    return {features: new Tensor('float32', new Float32Array(4).fill(extractions), [1, 2, 2])}
  })
  scorer.run.mockImplementation(async (feeds) => {
    expect(feeds.learning_rate.data[0]).toBeCloseTo(0.1)
    observed.push(feeds.features.data[0])
    return Object.fromEntries([
      ['loss', new Tensor('float32', Float32Array.of(0.5), [])],
      ...manifest.parameters.map(({name, dimensions}) => [
        `next_${name}`,
        new Tensor(
          'float32',
          Float32Array.from(feeds[name].data, (value) => value + 1),
          dimensions,
        ),
      ]),
    ])
  })
  const examples = [
    example,
    {...example, state: 'hello hello'},
    {
      ...example,
      question: {...question, type: 'score'} as const,
    },
  ]
  await model.train(examples, {epochs: 3, learningRate: 0.1})
  expect(features.run).toHaveBeenCalledTimes(3)
  expect(scorer.run).toHaveBeenCalledTimes(9)
  expect(observed).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3])
  expect(model.exportCheckpoint().steps).toBe(9)
  expect(model.exportCheckpoint().parameters).toEqual(new Float32Array(13).fill(10))
  await model.train([example], {learningRate: 0.1})
  expect(features.run).toHaveBeenCalledTimes(4)
  await model.close()
})

it('should discard cached features on cancellation and preserve completed updates for the next call', async () => {
  const model = await LayaWasm.load({baseUrl: 'https://example.test/model/'})
  scorer.run.mockImplementation(async (feeds) =>
    Object.fromEntries([
      ['loss', new Tensor('float32', Float32Array.of(0.5), [])],
      ...manifest.parameters.map(({name, dimensions}) => [
        `next_${name}`,
        new Tensor(
          'float32',
          Float32Array.from(feeds[name].data, (value) => value + 1),
          dimensions,
        ),
      ]),
    ]),
  )
  const controller = new AbortController()
  const result = await model.train([example], {
    epochs: 3,
    onProgress: () => controller.abort(),
    signal: controller.signal,
  })
  expect(result).toEqual({meanLoss: 0.5, status: 'cancelled', steps: 1})
  expect(model.exportCheckpoint().steps).toBe(1)
  expect(model.exportCheckpoint().parameters).toEqual(new Float32Array(13).fill(2))
  await model.train([example])
  expect(features.run).toHaveBeenCalledTimes(2)
  expect(model.exportCheckpoint().steps).toBe(2)
  await model.close()
})

it('should own checkpoint arrays and reject operations after closing', async () => {
  const model = await LayaWasm.load({baseUrl: 'https://example.test/model/'})
  const snapshot = model.exportCheckpoint()
  snapshot.parameters[0] = 99
  expect(model.exportCheckpoint().parameters[0]).toBe(1)
  model.restoreCheckpoint(snapshot)
  snapshot.parameters[0] = 88
  expect(model.exportCheckpoint().parameters[0]).toBe(99)
  await model.close()
  await model.close()
  expect(features.release).toHaveBeenCalledOnce()
  expect(scorer.release).toHaveBeenCalledOnce()
  await expect(model.systemOne('hello', {answer: question})).rejects.toThrow(/closed/)
})
