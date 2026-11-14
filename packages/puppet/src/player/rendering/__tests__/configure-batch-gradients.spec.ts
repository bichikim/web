import {type BatcherAdaptor, DefaultShader, Geometry, Shader, type WebGLRenderer} from 'pixi.js'
import {beforeEach, describe, expect, test, vi} from 'vitest'
import {configureBatchGradients} from '../configure-batch-gradients'
import {createGradientGeometry} from '../create-gradient-geometry'
import {createGradientShader} from '../create-gradient-shader'

vi.mock('../create-gradient-geometry', () => ({createGradientGeometry: vi.fn()}))
vi.mock('../create-gradient-shader', () => ({createGradientShader: vi.fn()}))

const fixture = () => {
  const adaptor = {start: vi.fn()} as unknown as BatcherAdaptor
  const add = vi.fn()
  const renderer = {
    context: {webGLVersion: 2},
    gl: {getExtension: () => null},
    renderPipes: {batch: {_adaptor: adaptor}},
    runners: {destroy: {add}},
  } as unknown as WebGLRenderer
  const source = new Geometry()
  const material = Object.create(DefaultShader.prototype) as DefaultShader
  const expanded = {destroy: vi.fn(), geometry: new Geometry(), update: vi.fn()}
  const shader = {destroy: vi.fn()} as unknown as Shader
  vi.mocked(createGradientGeometry).mockReturnValue(expanded)
  vi.mocked(createGradientShader).mockReturnValue(shader)
  return {adaptor, add, expanded, material, renderer, shader, source}
}

beforeEach(() => vi.clearAllMocks())

describe('configureBatchGradients', () => {
  test('should reuse one expansion and shader per source through repeated installation', () => {
    const {adaptor, expanded, material, renderer, shader, source} = fixture()
    const start = vi.mocked(adaptor.start)
    configureBatchGradients(renderer)
    configureBatchGradients(renderer)
    adaptor.start(renderer.renderPipes.batch, source, material)
    adaptor.start(renderer.renderPipes.batch, source, material)
    expect(createGradientGeometry).toHaveBeenCalledTimes(1)
    expect(createGradientShader).toHaveBeenCalledTimes(1)
    expect(expanded.update).toHaveBeenCalledTimes(2)
    expect(start).toHaveBeenLastCalledWith(renderer.renderPipes.batch, expanded.geometry, shader)
    source.destroy()
    expect(expanded.destroy).toHaveBeenCalledTimes(1)
  })

  test('should release expansions and owned programs when the renderer is destroyed', () => {
    const {adaptor, add, expanded, material, renderer, shader, source} = fixture()
    const destroy = vi.spyOn(shader, 'destroy')
    const start = adaptor.start
    configureBatchGradients(renderer)
    adaptor.start(renderer.renderPipes.batch, source, material)
    const owner = add.mock.calls[0]![0] as {destroy(): void}
    owner.destroy()
    expect(adaptor.start).toBe(start)
    expect(expanded.destroy).toHaveBeenCalledTimes(1)
    expect(destroy).toHaveBeenCalledWith(true)
    source.destroy()
    expect(expanded.destroy).toHaveBeenCalledTimes(1)
  })

  test('should preserve custom shaders and leave WebGL 1 unchanged', () => {
    const {adaptor, renderer, shader, source} = fixture()
    const start = vi.mocked(adaptor.start)
    configureBatchGradients(renderer)
    adaptor.start(renderer.renderPipes.batch, source, shader)
    expect(start).toHaveBeenCalledWith(renderer.renderPipes.batch, source, shader)
    expect(createGradientGeometry).not.toHaveBeenCalled()
    const legacy = fixture()
    legacy.renderer.context.webGLVersion = 1
    const legacyStart = legacy.adaptor.start
    configureBatchGradients(legacy.renderer)
    expect(legacy.adaptor.start).toBe(legacyStart)
  })
})
