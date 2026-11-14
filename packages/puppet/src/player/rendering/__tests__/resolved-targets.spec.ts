import {GlRenderTargetAdaptor, RenderTarget, Texture, type WebGLRenderer} from 'pixi.js'
import {describe, expect, test, vi} from 'vitest'
import {configureResolvedTargets} from '../resolved-targets'

const createRenderer = () => {
  const target = new RenderTarget({colorTextures: [Texture.EMPTY]})
  const framebuffer = {}
  const gpu = {
    framebuffer,
    height: 48,
    msaa: true,
    resolveTargetFramebuffer: {},
    width: 64,
  }
  const gl = {
    bindFramebuffer: vi.fn(),
    blitFramebuffer: vi.fn(),
    COLOR_BUFFER_BIT: 1,
    FRAMEBUFFER: 2,
    NEAREST: 3,
    READ_FRAMEBUFFER: 4,
  }
  const adaptor = new GlRenderTargetAdaptor()
  const clear = vi.spyOn(adaptor, 'clear').mockImplementation(() => {})
  const resize = vi.spyOn(adaptor, 'resizeGpuRenderTarget').mockImplementation(() => {})
  const draw = vi.fn()
  const renderer = {
    geometry: {draw},
    gl,
    renderTarget: {adaptor, getGpuRenderTarget: () => gpu, renderTarget: target},
    runners: {contextChange: {add: vi.fn()}},
  } as unknown as WebGLRenderer
  adaptor.init(renderer, renderer.renderTarget)
  configureResolvedTargets(renderer)
  return {adaptor, clear, draw, framebuffer, gl, gpu, renderer, resize, target}
}

describe('configureResolvedTargets', () => {
  test('should resolve unchanged multisampled pixels once and restore their draw framebuffer', () => {
    const {adaptor, framebuffer, gl, target} = createRenderer()
    adaptor.finishRenderPass(target)
    adaptor.bindFramebuffer({} as WebGLFramebuffer)
    adaptor.finishRenderPass(target)
    expect(gl.blitFramebuffer).toHaveBeenCalledExactlyOnceWith(0, 0, 64, 48, 0, 0, 64, 48, 1, 3)
    expect(gl.bindFramebuffer).toHaveBeenLastCalledWith(gl.FRAMEBUFFER, framebuffer)
  })

  test('should resolve again after drawing, clearing or reallocating a target', () => {
    const {adaptor, clear, draw, gl, renderer, resize, target} = createRenderer()
    adaptor.finishRenderPass(target)
    renderer.geometry.draw('triangle-list', 3, 0)
    adaptor.finishRenderPass(target)
    adaptor.clear(target, false)
    adaptor.finishRenderPass(target)
    expect(gl.blitFramebuffer).toHaveBeenCalledTimes(2)
    adaptor.clear(target, true)
    adaptor.finishRenderPass(target)
    adaptor.resizeGpuRenderTarget(target)
    adaptor.finishRenderPass(target)
    expect(gl.blitFramebuffer).toHaveBeenCalledTimes(4)
    expect(draw).toHaveBeenCalledExactlyOnceWith('triangle-list', 3, 0)
    expect(clear.mock.calls.map((call) => call[1])).toEqual([false, true])
    expect(resize).toHaveBeenCalledExactlyOnceWith(target)
  })

  test('should invalidate previous resolves after external GL state or GPU storage changes', () => {
    const {adaptor, gl, gpu, renderer, target} = createRenderer()
    adaptor.finishRenderPass(target)
    adaptor.resetState()
    adaptor.finishRenderPass(target)
    const replacement = {...gpu, framebuffer: {}}
    renderer.renderTarget.getGpuRenderTarget = vi.fn().mockReturnValue(replacement)
    adaptor.finishRenderPass(target)
    expect(gl.blitFramebuffer).toHaveBeenCalledTimes(3)
  })

  test('should preserve nonmultisampled passes without binding or resolving them', () => {
    const {adaptor, gl, gpu, target} = createRenderer()
    gpu.msaa = false
    adaptor.finishRenderPass(target)
    adaptor.finishRenderPass(target)
    expect(gl.blitFramebuffer).not.toHaveBeenCalled()
    expect(gl.bindFramebuffer).not.toHaveBeenCalled()
  })
})
