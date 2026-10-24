import {afterEach, expect, it, vi} from 'vitest'
import {createBrowserSpeechEndDetector} from '../speech-end-detector'

vi.mock('../speech-end-processor.ts?worker&url', () => ({default: '/processor.js'}))
afterEach(() => vi.unstubAllGlobals())

const setup = (loading = Promise.resolve()) => {
  const source = {connect: vi.fn(), disconnect: vi.fn()}
  const processor = {
    disconnect: vi.fn(),
    port: {close: vi.fn(), onmessage: null as ((event: {data: unknown}) => void) | null},
  }
  const context = {
    audioWorklet: {addModule: vi.fn(() => loading)},
    close: vi.fn(async () => {}),
    createMediaStreamSource: vi.fn(() => source),
    resume: vi.fn(async () => {}),
  }
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function setup() {
      return context
    }),
  )
  const node = vi.fn(function node() {
    return processor
  })
  vi.stubGlobal('AudioWorkletNode', node)
  return {context, node, processor, source}
}

it('should return null without Web Audio', () => {
  vi.stubGlobal('AudioContext', undefined)
  expect(createBrowserSpeechEndDetector({} as MediaStream)).toBeNull()
})

it('should deliver only speech end messages and dispose audio resources', async () => {
  const {context, processor, source} = setup()
  const detector = createBrowserSpeechEndDetector({} as MediaStream)
  const listener = vi.fn()
  const unsubscribe = detector?.subscribe(listener)
  await Promise.resolve()
  processor.port.onmessage?.({data: 'unrelated'})
  expect(listener).not.toHaveBeenCalled()
  processor.port.onmessage?.({data: 'speech-end'})
  expect(listener).toHaveBeenCalledOnce()
  unsubscribe?.()
  processor.port.onmessage?.({data: 'speech-end'})
  expect(listener).toHaveBeenCalledOnce()
  detector?.dispose()
  detector?.dispose()
  expect(source.disconnect).toHaveBeenCalledOnce()
  expect(processor.disconnect).toHaveBeenCalledOnce()
  expect(processor.port.close).toHaveBeenCalledOnce()
  expect(context.close).toHaveBeenCalledOnce()
  expect(processor.port.onmessage).toBeNull()
})

it('should not connect after disposal during module loading', async () => {
  const pending = Promise.withResolvers<void>()
  const {node, context} = setup(pending.promise)
  const detector = createBrowserSpeechEndDetector({} as MediaStream)
  detector?.dispose()
  pending.resolve()
  await Promise.resolve()
  expect(node).not.toHaveBeenCalled()
  expect(context.close).toHaveBeenCalledOnce()
})

it('should close the context when loading fails', async () => {
  const {context} = setup(Promise.reject(new Error('load failed')))
  createBrowserSpeechEndDetector({} as MediaStream)
  await Promise.resolve()
  await Promise.resolve()
  expect(context.close).toHaveBeenCalledOnce()
})
