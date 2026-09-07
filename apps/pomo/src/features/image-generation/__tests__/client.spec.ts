import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {prepareImageModels} from '../prepare'
import {createModelDownloadController} from '../../model-download/controller'
vi.mock('../prepare', () => ({prepareImageModels: vi.fn()}))
import {runImageGeneration} from '../client'

const workers: Array<{
  onerror: ((event: {message: string}) => void) | null
  onmessage: ((event: {data: unknown}) => void) | null
  postMessage: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
}> = []

beforeEach(() => {
  vi.mocked(prepareImageModels).mockResolvedValue(undefined)
  workers.length = 0
  vi.stubGlobal(
    'Worker',
    class {
      onerror = null
      onmessage = null
      postMessage = vi.fn()
      terminate = vi.fn()
      constructor() {
        workers.push(this)
      }
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

const options = () => ({
  downloads: createModelDownloadController(),
  idea: '춤추는 햄버거',
  modelId: 'gemma-4-e2b' as const,
  onUpdate: vi.fn(),
  settings: {height: 512, seed: 7, steps: 4, variant: 'ternary' as const, width: 512},
  signal: new AbortController().signal,
})

it('should release the chat worker before loading Bonsai and forward the English prompt and settings', async () => {
  const request = options()
  const result = runImageGeneration(request)
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  workers[0]?.onmessage?.({data: {prompt: 'Abstract art of a dancing hamburger.', type: 'prompt'}})
  await vi.waitFor(() => expect(workers).toHaveLength(2))
  expect(workers[0]?.terminate).toHaveBeenCalledOnce()
  expect(workers[1]?.postMessage).toHaveBeenCalledWith({
    prompt: 'Abstract art of a dancing hamburger.',
    settings: request.settings,
    type: 'image',
  })
  const blob = new Blob(['png'], {type: 'image/png'})
  workers[1]?.onmessage?.({data: {blob, type: 'image'}})
  await expect(result).resolves.toEqual({blob, prompt: 'Abstract art of a dancing hamburger.'})
  expect(workers[1]?.terminate).toHaveBeenCalledOnce()
})

it('should terminate an active download on cancellation without starting Bonsai', async () => {
  const abort = new AbortController()
  const result = runImageGeneration({...options(), signal: abort.signal})
  const assertion = expect(result).rejects.toMatchObject({name: 'AbortError'})
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  abort.abort()
  await assertion
  expect(workers).toHaveLength(1)
  expect(workers[0]?.terminate).toHaveBeenCalledOnce()
})

it('should propagate worker failures and release resources', async () => {
  const result = runImageGeneration(options())
  const assertion = expect(result).rejects.toThrow('GPU failed')
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  workers[0]?.onerror?.({message: 'GPU failed'})
  await assertion
  expect(workers[0]?.terminate).toHaveBeenCalledOnce()
})

it('should terminate Bonsai when cancellation arrives after the prompt stage', async () => {
  const abort = new AbortController()
  const result = runImageGeneration({...options(), signal: abort.signal})
  const assertion = expect(result).rejects.toMatchObject({name: 'AbortError'})
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  workers[0]?.onmessage?.({data: {prompt: 'A dancing hamburger', type: 'prompt'}})
  await vi.waitFor(() => expect(workers).toHaveLength(2))
  abort.abort()
  await assertion
  expect(workers[1]?.terminate).toHaveBeenCalledOnce()
})

it('should avoid starting a worker for an already cancelled request', async () => {
  const abort = new AbortController()
  abort.abort()
  await expect(runImageGeneration({...options(), signal: abort.signal})).rejects.toMatchObject({
    name: 'AbortError',
  })
  expect(workers).toHaveLength(0)
})

it.each([
  ['abstract', 'Abstract art, expressive shapes, nonliteral forms, bold color relationships.'],
  ['watercolor', 'Watercolor painting, translucent washes, soft edges, textured paper.'],
  ['none', ''],
] as const)(
  'should pass the selected %s context to the image model and result',
  async (style, context) => {
    const request = {...options(), style}
    const result = runImageGeneration(request)
    await vi.waitFor(() => expect(workers).toHaveLength(1))
    workers[0]?.onmessage?.({data: {prompt: 'A cat in a park.', type: 'prompt'}})
    await vi.waitFor(() => expect(workers).toHaveLength(2))
    const prompt = context === '' ? 'A cat in a park.' : `A cat in a park.\nArt style: ${context}`
    expect(workers[1]?.postMessage).toHaveBeenCalledWith({
      prompt,
      settings: request.settings,
      type: 'image',
    })
    expect(request.onUpdate).toHaveBeenCalledWith({prompt, type: 'prompt'})
    const blob = new Blob(['png'], {type: 'image/png'})
    workers[1]?.onmessage?.({data: {blob, type: 'image'}})
    await expect(result).resolves.toEqual({blob, prompt})
  },
)
