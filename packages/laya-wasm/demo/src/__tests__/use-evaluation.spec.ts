import {afterEach, expect, it, vi} from 'vitest'
import {createRoot} from 'solid-js'
import {useEvaluation} from '../use-evaluation'

afterEach(() => vi.unstubAllGlobals())
const line = JSON.stringify({
  question: {criteria: ['a', 'b'], instructions: 'Pick', type: 'choice'},
  state: 'held out',
  target: [1, 0],
})
it('should replace evaluation examples without appending and preserve them after an invalid import', async () => {
  const onError = vi.fn()
  const onChange = vi.fn()
  const {evaluation, dispose} = createRoot((dispose) => ({
    dispose,
    evaluation: useEvaluation({busy: () => false, onChange, onError}),
  }))
  try {
    await evaluation.importFile(
      Object.assign(new File([], 'evaluation.jsonl'), {text: async () => line}),
    )
    await evaluation.importFile(
      Object.assign(new File([], 'evaluation.jsonl'), {text: async () => line}),
    )
    expect(evaluation.examples()).toHaveLength(1)
    await evaluation.importFile(
      Object.assign(new File([], 'invalid.jsonl'), {text: async () => '{}'}),
    )
    expect(onError).toHaveBeenCalledOnce()
    expect(evaluation.examples()).toHaveLength(1)
    evaluation.clear()
    expect(evaluation.examples()).toEqual([])
    expect(onChange).toHaveBeenCalledTimes(3)
  } finally {
    dispose()
  }
})
it('should load the built-in evaluation set and keep existing data on network failure', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(line))
    .mockResolvedValueOnce(new Response('', {status: 500}))
  vi.stubGlobal('fetch', fetcher)
  const onError = vi.fn()
  const {evaluation, dispose} = createRoot((dispose) => ({
    dispose,
    evaluation: useEvaluation({busy: () => false, onChange: vi.fn(), onError}),
  }))
  try {
    await evaluation.loadSample()
    expect(evaluation.examples()).toHaveLength(1)
    await evaluation.loadSample()
    expect(evaluation.examples()).toHaveLength(1)
    expect(onError).toHaveBeenCalledOnce()
    expect(evaluation.importing()).toBe(false)
  } finally {
    dispose()
  }
})

it('should load a separate evaluation set from its explicit path', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(line))
  vi.stubGlobal('fetch', fetcher)
  const onChange = vi.fn()
  const {evaluation, dispose} = createRoot((dispose) => ({
    dispose,
    evaluation: useEvaluation({busy: () => false, onChange, onError: vi.fn()}),
  }))
  try {
    await evaluation.loadSample('/datasets/generalization/evaluation.jsonl')
    expect(fetcher).toHaveBeenCalledWith(
      '/datasets/generalization/evaluation.jsonl',
      expect.objectContaining({signal: expect.any(AbortSignal)}),
    )
    expect(evaluation.examples()).toHaveLength(1)
    expect(onChange).toHaveBeenCalledOnce()
  } finally {
    dispose()
  }
})
