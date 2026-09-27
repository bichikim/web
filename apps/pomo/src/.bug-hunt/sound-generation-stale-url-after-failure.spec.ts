/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {useSoundGeneration} from '../features/sound-generation/use-sound-generation'

afterEach(() => vi.unstubAllGlobals())

it('should clear the previous result URL when a new generation fails', () => {
  const worker = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  }
  const nativeUrl = URL
  vi.stubGlobal(
    'URL',
    class extends nativeUrl {
      static createObjectURL = vi
        .fn()
        .mockReturnValueOnce('blob:first')
        .mockReturnValueOnce('blob:second')
      static revokeObjectURL = vi.fn()
    },
  )
  vi.stubGlobal(
    'Worker',
    vi.fn(function MockWorker() {
      return worker
    }),
  )

  createRoot((dispose) => {
    try {
      const generation = useSoundGeneration()

      generation.generate({prompt: 'rain', seconds: 30})
      worker.onmessage?.({
        data: {blob: new Blob(['first']), type: 'result'},
      } as MessageEvent)
      expect(generation.url()).toBe('blob:first')

      generation.generate({prompt: 'ocean', seconds: 45})
      worker.onmessage?.({
        data: {message: 'GPU failed', type: 'error'},
      } as MessageEvent)

      expect(generation.error()).toBe('GPU failed')
      expect(generation.url()).toBeNull()
    } finally {
      dispose()
    }
  })
})
