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
        connectionSeconds: 4,
        prompt: 'rain',
        source: new Blob(['wav']),
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

it('should report an error when generation is requested while busy', () => {
  const postMessage = vi.fn()
  const worker = vi.fn(function MockWorker() {
    return {postMessage, terminate: vi.fn()}
  })
  vi.stubGlobal('Worker', worker)

  createRoot((dispose) => {
    try {
      const generation = useSoundGeneration()
      const firstRequest = {prompt: 'rain', seconds: 30}
      const secondRequest = {prompt: 'ocean', seconds: 45}

      generation.generate(firstRequest)
      generation.generate(secondRequest)

      expect(worker).toHaveBeenCalledOnce()
      expect(postMessage).toHaveBeenCalledOnce()
      expect(postMessage).toHaveBeenCalledWith(firstRequest)
      expect(generation.error()).toBe('이미 생성 중인 작업이 있습니다. 완료 후 다시 시도해 주세요.')
      expect(generation.status()).toBe('생성이 진행 중입니다. 완료 후 다시 시도해 주세요.')
    } finally {
      dispose()
    }
  })
})

it('should clear the busy error after the active generation succeeds', () => {
  const postMessage = vi.fn()
  const worker = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    postMessage,
    terminate: vi.fn(),
  }
  const nativeUrl = URL
  vi.stubGlobal(
    'URL',
    class extends nativeUrl {
      static createObjectURL = vi.fn(() => 'blob:result')
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
      generation.generate({prompt: 'ocean', seconds: 45})
      expect(generation.error()).not.toBeNull()

      worker.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}} as MessageEvent)

      expect(generation.error()).toBeNull()
      expect(generation.url()).toBe('blob:result')
    } finally {
      dispose()
    }
  })
})
