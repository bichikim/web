/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useSoundGeneration} from '../use-sound-generation'

afterEach(() => vi.unstubAllGlobals())
it.each([3601, 21600, 0, NaN, 1.5])(
  'should reject UI duration %s before starting a Worker',
  (seconds) => {
    const worker = vi.fn()
    vi.stubGlobal('Worker', worker)
    createRoot((dispose) => {
      try {
        const generation = useSoundGeneration()
        generation.generate({prompt: 'rain', seconds})
        expect(generation.error()).toContain('3,600')
        expect(generation.busy()).toBe(false)
        expect(worker).not.toHaveBeenCalled()
      } finally {
        dispose()
      }
    })
  },
)
it('should accept one hour in the UI and terminate the Worker on stop', () => {
  const postMessage = vi.fn()
  const terminate = vi.fn()
  vi.stubGlobal(
    'Worker',
    vi.fn(function MockWorker() {
      return {postMessage, terminate}
    }),
  )
  createRoot((dispose) => {
    try {
      const generation = useSoundGeneration()
      generation.generate({prompt: 'rain', seconds: 3600})
      expect(postMessage).toHaveBeenCalledWith({prompt: 'rain', seconds: 3600})
      expect(generation.busy()).toBe(true)
      generation.stop()
      expect(terminate).toHaveBeenCalledOnce()
      expect(generation.busy()).toBe(false)
    } finally {
      dispose()
    }
  })
})

it('should pass loop input to the Worker without applying generation duration validation', () => {
  const postMessage = vi.fn()
  const terminate = vi.fn()
  vi.stubGlobal(
    'Worker',
    vi.fn(function MockWorker() {
      return {postMessage, terminate}
    }),
  )
  createRoot((dispose) => {
    try {
      const generation = useSoundGeneration()
      const request = {
        prompt: 'rain',
        source: new Blob(['wav']),
        transitionSeconds: 4,
        type: 'loop' as const,
      }
      generation.generate(request)
      expect(postMessage).toHaveBeenCalledWith(request)
      expect(generation.error()).toBeNull()
      expect(generation.busy()).toBe(true)
      generation.stop()
      expect(terminate).toHaveBeenCalledOnce()
    } finally {
      dispose()
    }
  })
})
