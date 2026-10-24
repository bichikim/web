/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {createSoundWorker} from '../create-sound-worker'
afterEach(() => vi.unstubAllGlobals())
it('should construct the sound module worker with its existing entry URL', () => {
  const port = {onerror: null, onmessage: null, postMessage: vi.fn(), terminate: vi.fn()}
  const constructor = vi.fn(function createWorker() {
    return port
  })
  vi.stubGlobal('Worker', constructor)
  expect(createSoundWorker()).toBe(port)
  expect(constructor).toHaveBeenCalledWith(
    expect.objectContaining({pathname: new URL('../worker.ts', import.meta.url).pathname}),
    {type: 'module'},
  )
})
it('should propagate browser worker construction failure', () => {
  const error = new Error('worker unavailable')
  vi.stubGlobal(
    'Worker',
    vi.fn(function createWorker() {
      throw error
    }),
  )
  expect(createSoundWorker).toThrow(error)
})
