import {Flux2KleinPipeline, type LoadingProgress} from '@winter-love/bonsai'
import {afterEach, expect, it, vi} from 'vitest'
import {loadImageModel} from '../loader'

vi.mock('@winter-love/bonsai', () => ({Flux2KleinPipeline: {from_pretrained: vi.fn()}}))

afterEach(() => vi.resetAllMocks())

it.each([
  [{loaded: 1}, undefined],
  [{total: 3}, undefined],
  [{loaded: 0, total: 0}, undefined],
  [{loaded: 1, total: 3}, 33],
  [{loaded: 0, total: 3}, 0],
  [{loaded: 3, total: 3}, 100],
] satisfies Array<[LoadingProgress, number | undefined]>)(
  'should report loading progress %j as %s percent',
  async (progress, percentage) => {
    const pipeline = {destroy: vi.fn(), generate: vi.fn()}
    vi.mocked(Flux2KleinPipeline.from_pretrained).mockImplementation(async (_model, options) => {
      options.onProgress(progress)
      return pipeline
    })
    const onProgress = vi.fn()

    await expect(loadImageModel({onProgress, variant: 'ternary'})).resolves.toBe(pipeline)

    expect(onProgress).toHaveBeenCalledExactlyOnceWith({
      label: '이미지 모델을 준비하고 있어요',
      ...(percentage === undefined ? {} : {percentage}),
      type: 'progress',
    })
  },
)

it('should propagate model loading failures', async () => {
  const error = new Error('Model download failed')
  vi.mocked(Flux2KleinPipeline.from_pretrained).mockRejectedValue(error)

  await expect(loadImageModel({onProgress: vi.fn(), variant: 'binary'})).rejects.toBe(error)
})
