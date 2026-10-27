/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createPlayerRenderer, type PlayerRenderer} from '../create-player-renderer'
import {createRendererController} from '../create-renderer-controller'

vi.mock('../create-player-renderer', () => ({createPlayerRenderer: vi.fn()}))

const resource = (): PlayerRenderer => ({
  applyFrame: vi.fn(),
  destroy: vi.fn(),
  getPaintOrder: vi.fn(() => []),
  getPartVertices: vi.fn(),
  getRenderingInfo: vi.fn(() => ({antialiasing: 'msaa' as const, renderer: 'webgl' as const})),
  redraw: vi.fn(),
  resize: vi.fn(),
  setRunning: vi.fn(),
  setViewCamera: vi.fn(),
  subscribeFrame: vi.fn(),
  toDocumentPoint: vi.fn((point) => point),
  updateDocument: vi.fn(() => true),
})
afterEach(() => vi.resetAllMocks())

test('should replace GPU resources while retaining the last frame, camera, density and ticker state', async () => {
  const previous = resource()
  const next = resource()
  vi.mocked(createPlayerRenderer).mockResolvedValueOnce(previous).mockResolvedValueOnce(next)
  const document = createEmptyDocument()
  const controller = await createRendererController({
    canvas: globalThis.document.createElement('canvas'),
    document,
  })
  const frame = {
    groupOpacitySamples: new Map(),
    modelOpacity: 1,
    motionParameterValues: {},
    parameterValues: {},
    vertexSamples: new Map(),
  }
  const camera = {x: 12, y: -3, zoom: 0.2}
  const onFrame = vi.fn()
  controller.applyFrame(frame, {angle: 2})
  controller.setViewCamera(camera)
  controller.resize(0.4)
  controller.setRunning(false)
  controller.subscribeFrame(onFrame)
  const canvas = globalThis.document.createElement('canvas')
  await expect(
    controller.configure({antialiasing: 'ssaa', canvas, renderer: 'webgpu'}),
  ).resolves.toBe('applied')
  expect(createPlayerRenderer).toHaveBeenLastCalledWith(
    expect.objectContaining({
      antialiasing: 'ssaa',
      canvas,
      document,
      renderer: 'webgpu',
      resolution: 0.4,
    }),
  )
  expect(next.applyFrame).toHaveBeenCalledExactlyOnceWith(frame, {angle: 2})
  expect(next.setViewCamera).toHaveBeenCalledExactlyOnceWith(camera)
  expect(next.setRunning).toHaveBeenLastCalledWith(false)
  expect(next.subscribeFrame).toHaveBeenCalledExactlyOnceWith(onFrame)
  expect(onFrame).not.toHaveBeenCalled()
  expect(previous.destroy).toHaveBeenCalledOnce()
  controller.destroy()
  expect(next.destroy).toHaveBeenCalledOnce()
})

test('should retain the current renderer when initialization fails', async () => {
  const previous = resource()
  const failure = new Error('WebGPU unavailable')
  vi.mocked(createPlayerRenderer).mockResolvedValueOnce(previous).mockRejectedValueOnce(failure)
  const controller = await createRendererController({
    canvas: document.createElement('canvas'),
    document: createEmptyDocument(),
  })
  await expect(
    controller.configure({canvas: document.createElement('canvas'), renderer: 'webgpu'}),
  ).rejects.toBe(failure)
  controller.redraw()
  expect(previous.redraw).toHaveBeenCalledOnce()
  expect(previous.destroy).not.toHaveBeenCalled()
  controller.destroy()
})

test('should release superseded requests and never publish them', async () => {
  const previous = resource()
  const obsolete = resource()
  const latest = resource()
  let complete: (renderer: PlayerRenderer) => void = () => undefined
  vi.mocked(createPlayerRenderer)
    .mockResolvedValueOnce(previous)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve
      }),
    )
    .mockResolvedValueOnce(latest)
  const controller = await createRendererController({
    canvas: document.createElement('canvas'),
    document: createEmptyDocument(),
  })
  const first = controller.configure({canvas: document.createElement('canvas'), renderer: 'webgpu'})
  await expect(
    controller.configure({canvas: document.createElement('canvas'), renderer: 'webgl'}),
  ).resolves.toBe('applied')
  complete(obsolete)
  await expect(first).resolves.toBe('superseded')
  expect(obsolete.destroy).toHaveBeenCalledOnce()
  expect(obsolete.subscribeFrame).not.toHaveBeenCalled()
  controller.destroy()
})

test('should release a renderer that finishes after disposal', async () => {
  const previous = resource()
  const pending = resource()
  let complete: (renderer: PlayerRenderer) => void = () => undefined
  vi.mocked(createPlayerRenderer)
    .mockResolvedValueOnce(previous)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve
      }),
    )
  const controller = await createRendererController({
    canvas: document.createElement('canvas'),
    document: createEmptyDocument(),
  })
  const request = controller.configure({canvas: document.createElement('canvas')})
  controller.destroy()
  complete(pending)
  await expect(request).resolves.toBe('destroyed')
  expect(pending.destroy).toHaveBeenCalledOnce()
  expect(previous.destroy).toHaveBeenCalledOnce()
})

test('should initialize again when a document changed incompatibly during preparation', async () => {
  const previous = resource()
  const obsolete = {...resource(), updateDocument: vi.fn(() => false)}
  const latest = resource()
  let complete: (renderer: PlayerRenderer) => void = () => undefined
  vi.mocked(createPlayerRenderer)
    .mockResolvedValueOnce(previous)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve
      }),
    )
    .mockResolvedValueOnce(latest)
  const controller = await createRendererController({
    canvas: document.createElement('canvas'),
    document: createEmptyDocument(),
  })
  const request = controller.configure({canvas: document.createElement('canvas')})
  const replacement = {...createEmptyDocument(), viewport: {height: 200, width: 200}}
  controller.updateDocument(replacement)
  complete(obsolete)
  await expect(request).resolves.toBe('applied')
  expect(obsolete.destroy).toHaveBeenCalledOnce()
  expect(createPlayerRenderer).toHaveBeenLastCalledWith(
    expect.objectContaining({document: replacement}),
  )
  controller.destroy()
})
