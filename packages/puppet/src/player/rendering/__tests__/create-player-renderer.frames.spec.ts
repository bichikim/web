/** @vitest-environment jsdom */
import {Application, Container, Ticker, UPDATE_PRIORITY} from 'pixi.js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import * as transformKeys from '../../internal/create-native-transform-key'
import {createPlayerRenderer} from '../create-player-renderer'

vi.mock('pixi.js', async () => {
  const actual = await vi.importActual<typeof import('pixi.js')>('pixi.js')
  return {...actual, Application: vi.fn()}
})

const rendering = {
  frame: {layers: new Map(), plans: [], spatialPoses: new Map()},
  vertices: new Float32Array(),
}
const motionMix = {
  groupOpacitySamples: new Map(),
  modelOpacity: 1,
  motionParameterValues: {},
  parameterValues: {},
  vertexSamples: new Map(),
}
let ticker: Ticker
const render = vi.fn()
const stop = vi.fn()

beforeEach(() => {
  ticker = new Ticker()
  const application = {
    destroy: () => ticker.destroy(),
    init: async () => {
      ticker.add(render, application, UPDATE_PRIORITY.LOW)
    },
    render,
    renderer: {resetState: vi.fn(), resolution: 1},
    screen: {height: 100, width: 100},
    stage: new Container(),
    start: vi.fn(),
    stop,
    ticker,
  }
  vi.mocked(Application).mockImplementation(function createApplication() {
    return application as unknown as Application
  })
})
afterEach(() => {
  ticker.destroy()
  vi.clearAllMocks()
})

test('should compile local transforms only when it evaluates a frame for the current document', async () => {
  const compile = vi.spyOn(transformKeys, 'createNativeTransformKey')
  const source = createEmptyDocument()
  const renderer = await createPlayerRenderer({
    canvas: document.createElement('canvas'),
    document: source,
  })
  try {
    renderer.applyPreparedFrame(rendering)
    expect(compile).not.toHaveBeenCalled()
    renderer.applyFrame(motionMix, {})
    renderer.applyFrame(motionMix, {})
    expect(compile).toHaveBeenCalledOnce()

    expect(renderer.updateDocument({...source}, true)).toBe(true)
    renderer.applyPreparedFrame(rendering)
    expect(compile).toHaveBeenCalledOnce()
    renderer.applyFrame(motionMix, {})
    expect(compile).toHaveBeenCalledTimes(2)
  } finally {
    compile.mockRestore()
  }
})

test('should draw a completed Worker frame once while idle ticker callbacks keep advancing', async () => {
  const renderer = await createPlayerRenderer({
    canvas: document.createElement('canvas'),
    document: createEmptyDocument(),
  })
  renderer.redraw()
  render.mockClear()
  ticker.update(1)
  ticker.update(17)
  expect(render).not.toHaveBeenCalled()
  renderer.applyPreparedFrame(rendering)
  ticker.update(33)
  ticker.update(49)
  expect(render).toHaveBeenCalledOnce()
})

test('should present the last completed Worker frame before stopping the ticker', async () => {
  const renderer = await createPlayerRenderer({
    canvas: document.createElement('canvas'),
    document: createEmptyDocument(),
  })
  renderer.redraw()
  render.mockClear()
  renderer.applyPreparedFrame(rendering)
  renderer.setRunning(false)
  expect(render).toHaveBeenCalledOnce()
  expect(stop).toHaveBeenCalledOnce()
})

test('should keep external overlays animating and redraw once when the overlay is hidden', async () => {
  let active = false
  const before = vi.fn()
  const after = vi.fn()
  const renderer = await createPlayerRenderer({
    canvas: document.createElement('canvas'),
    document: createEmptyDocument(),
    externalRendering: () => active,
    onAfterRender: after,
    onBeforeRender: before,
  })
  renderer.redraw()
  render.mockClear()
  active = true
  ticker.update(1)
  ticker.update(17)
  expect(render).toHaveBeenCalledTimes(2)
  expect(before).toHaveBeenCalledTimes(2)
  expect(after).toHaveBeenCalledTimes(2)
  active = false
  ticker.update(33)
  ticker.update(49)
  expect(render).toHaveBeenCalledTimes(3)
  expect(before).toHaveBeenCalledTimes(2)
  expect(after).toHaveBeenCalledTimes(2)
})
