/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../src/player'
import {createComparison} from '../create-comparison'
import type {ComparisonOptions, Reference} from '../types'
const mocks = vi.hoisted(() => ({
  disconnect: vi.fn(),
  evaluation: vi.fn(),
  reference: vi.fn(),
  renderer: vi.fn(),
}))
vi.mock('../reference.mjs', () => ({createReference: mocks.reference}))
vi.mock('../../../src/player/rendering/create-player-renderer', () => ({
  createPlayerRenderer: mocks.renderer,
}))
vi.mock('../create-evaluation', () => ({createEvaluation: mocks.evaluation}))
const reference: Reference = {
  destroy: vi.fn(),
  draw: vi.fn(),
  reset: vi.fn(),
  resize: vi.fn(),
  step: vi.fn(),
  values: () => ({}),
}
const renderer = {destroy: vi.fn(), resize: vi.fn(), setRunning: vi.fn()}
const options = (): ComparisonOptions => ({
  canvas: document.createElement('canvas'),
  document: createDemoDocument(),
  frameworkUrl: '',
  host: document.createElement('div'),
  onError: vi.fn(),
  onFrame: vi.fn(),
  poffoCanvas: document.createElement('canvas'),
  sdkOrigin: '',
  signal: new AbortController().signal,
})
beforeEach(() => {
  mocks.reference.mockResolvedValue(reference)
  mocks.renderer.mockResolvedValue(renderer)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = mocks.disconnect
    },
  )
})
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

test('should release both renderers when initial simulation fails', async () => {
  mocks.evaluation.mockReturnValue({
    reset: () => {
      throw new Error('invalid simulation')
    },
  })
  await expect(createComparison(options())).rejects.toThrow('invalid simulation')
  expect(reference.destroy).toHaveBeenCalledOnce()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  expect(mocks.disconnect).toHaveBeenCalledOnce()
})

test('should release the reference when player renderer initialization fails', async () => {
  mocks.renderer.mockRejectedValue(new Error('GPU unavailable'))
  await expect(createComparison(options())).rejects.toThrow('GPU unavailable')
  expect(reference.destroy).toHaveBeenCalledOnce()
})

test('should release both renderers when constructing the simulation fails', async () => {
  mocks.evaluation.mockImplementation(() => {
    throw new Error('simulation unavailable')
  })
  await expect(createComparison(options())).rejects.toThrow('simulation unavailable')
  expect(reference.destroy).toHaveBeenCalledOnce()
  expect(renderer.destroy).toHaveBeenCalledOnce()
})

test('should release initialized resources only once when cancelled and destroyed', async () => {
  mocks.evaluation.mockReturnValue({draw: vi.fn(), reset: vi.fn()})
  const request = new AbortController()
  const controller = await createComparison({...options(), signal: request.signal})
  request.abort()
  controller.destroy()
  expect(reference.destroy).toHaveBeenCalledOnce()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  expect(mocks.disconnect).toHaveBeenCalledOnce()
})
