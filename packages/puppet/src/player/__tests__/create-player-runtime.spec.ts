import {expect, test, vi} from 'vitest'
import {createPlayerRuntime} from '../create-player-runtime'
import type {RendererController} from '../rendering/create-renderer-controller'
import {prepareDocument, puppetDocument} from './fixtures/document'

const createRenderer = (): RendererController => ({
  applyFrame: vi.fn(),
  applyPreparedFrame: vi.fn(),
  configure: vi.fn(),
  destroy: vi.fn(),
  getPaintOrder: () => [],
  getPartVertices: () => undefined,
  getRenderingInfo: () => ({antialiasing: 'ssaa', renderer: 'webgl'}),
  redraw: vi.fn(),
  resize: vi.fn(),
  setRunning: vi.fn(),
  setViewCamera: vi.fn(),
  subscribeFrame: vi.fn(),
  toDocumentPoint: (point) => point,
  updateDocument: () => true,
})
const setup = () => {
  const renderer = createRenderer()
  const document = prepareDocument({
    ...puppetDocument,
    motions: [{duration: 2, id: 'walk', tracks: []}],
    parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: -1, name: 'P'}],
  })
  const onFrame = vi.fn()
  return {
    onFrame,
    renderer,
    runtime: createPlayerRuntime({document, onFrame, randomSeed: 42, renderer}),
  }
}

test('should defer numeric evaluation while retaining command validation and control state', () => {
  const {runtime, renderer, onFrame} = setup()
  vi.mocked(renderer.applyFrame).mockClear()
  vi.mocked(renderer.redraw).mockClear()
  onFrame.mockClear()
  runtime.setDeferred(true)
  expect(runtime.player.setParameterValue('missing', 1)).toBe(false)
  expect(runtime.player.setParameterValue('p', 3)).toBe(true)
  runtime.player.setPhysicsOptions({wind: [1, 0]})
  runtime.player.resetPhysics()
  expect(runtime.capture().parameterValues).toEqual({p: 1})
  expect(runtime.player.getParameterValue('p')).toBe(0)
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  expect(renderer.redraw).not.toHaveBeenCalled()
  expect(onFrame).not.toHaveBeenCalled()
  expect(runtime.takeEvaluation()).toEqual({settle: true})
  expect(runtime.takeEvaluation()).toEqual({settle: false})
  runtime.setDeferred(false)
  runtime.render()
  expect(runtime.player.getParameterValue('p')).toBe(1)
  expect(renderer.applyFrame).toHaveBeenCalledOnce()
  runtime.player.destroy()
})

test('should report the completed Worker frame independently from pending timeline controls', () => {
  const {runtime, onFrame} = setup()
  runtime.setDeferred(true)
  runtime.player.seek(1.5)
  onFrame.mockClear()
  runtime.notifyFrame({duration: 2, motionId: 'walk', time: 0.5})
  expect(onFrame).toHaveBeenCalledWith({duration: 2, motionId: 'walk', time: 0.5})
  runtime.player.destroy()
})

test('should release owned resources when the initial frame callback rejects creation', () => {
  const renderer = createRenderer()
  const failure = new Error('Initial frame observer failed')
  expect(() =>
    createPlayerRuntime({
      document: prepareDocument(puppetDocument),
      onFrame() {
        throw failure
      },
      randomSeed: 42,
      renderer,
    }),
  ).toThrow(failure)
  expect(renderer.destroy).toHaveBeenCalledOnce()
})

test('should release owned resources when the initial draw fails', () => {
  const renderer = createRenderer()
  const failure = new Error('Initial draw failed')
  vi.mocked(renderer.redraw).mockImplementationOnce(() => {
    throw failure
  })
  expect(() =>
    createPlayerRuntime({document: prepareDocument(puppetDocument), randomSeed: 42, renderer}),
  ).toThrow(failure)
  expect(renderer.destroy).toHaveBeenCalledOnce()
})

test('should retain both the initial failure and a failure while releasing its resources', () => {
  const renderer = createRenderer()
  const initial = new Error('Initial frame failed')
  const disposal = new Error('Renderer disposal failed')
  vi.mocked(renderer.destroy).mockImplementationOnce(() => {
    throw disposal
  })
  let failure: unknown
  try {
    createPlayerRuntime({
      document: prepareDocument(puppetDocument),
      onFrame() {
        throw initial
      },
      randomSeed: 42,
      renderer,
    })
  } catch (cause) {
    failure = cause
  }
  expect(failure).toBeInstanceOf(AggregateError)
  expect(failure).toMatchObject({cause: initial, errors: [initial, disposal]})
  expect(renderer.destroy).toHaveBeenCalledOnce()
})

test('should keep a destroyed runtime inactive when an earlier numeric checkpoint is restored', () => {
  const {runtime, renderer, onFrame} = setup()
  const checkpoint = structuredClone(runtime.capture())
  runtime.player.destroy()
  vi.mocked(renderer.applyFrame).mockClear()
  vi.mocked(renderer.redraw).mockClear()
  onFrame.mockClear()
  runtime.restore(checkpoint)
  runtime.player.resume()
  runtime.tick(0.25)
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  expect(renderer.redraw).not.toHaveBeenCalled()
  expect(onFrame).not.toHaveBeenCalled()
  expect(renderer.destroy).toHaveBeenCalledOnce()
})
