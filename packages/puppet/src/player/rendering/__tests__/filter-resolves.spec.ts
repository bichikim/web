import {
  ColorMatrixFilter,
  Container,
  FilterEffect,
  GlRenderTarget,
  GlRenderTargetAdaptor,
  RenderTarget,
  RenderTexture,
  type WebGLRenderer,
} from 'pixi.js'
import {describe, expect, test, vi} from 'vitest'
import {configureFilterResolves} from '../filter-resolves'
import {configureResolvedTargets} from '../resolved-targets'

const createRenderer = () => {
  const input = RenderTexture.create({antialias: true, height: 48, width: 64})
  const output = RenderTexture.create({antialias: true, height: 48, width: 64})
  const surfaces = new Map([
    [input, new RenderTarget({colorTextures: [input]})],
    [output, new RenderTarget({colorTextures: [output]})],
  ])
  const buffers = new Map(
    [...surfaces.values()].map((surface) => {
      const gpu = new GlRenderTarget()
      gpu.framebuffer = {} as WebGLFramebuffer
      gpu.resolveTargetFramebuffer = {} as WebGLFramebuffer
      gpu.width = 64
      gpu.height = 48
      gpu.msaa = true
      return [surface, gpu] as const
    }),
  )
  const gl = {
    bindFramebuffer: vi.fn(),
    blitFramebuffer: vi.fn(),
    COLOR_BUFFER_BIT: 1,
    copyTexSubImage2D: vi.fn(),
    FRAMEBUFFER: 2,
    NEAREST: 3,
    READ_FRAMEBUFFER: 4,
    TEXTURE_2D: 5,
  }
  const adaptor = new GlRenderTargetAdaptor()
  const apply = vi.fn()
  const push = vi.fn()
  const targets = {
    adaptor,
    getGpuRenderTarget: (target: RenderTarget) => buffers.get(target)!,
    getRenderTarget: (texture: RenderTexture) => surfaces.get(texture)!,
    renderTarget: surfaces.get(input)!,
  }
  const renderer = {
    filter: {applyFilter: apply, push},
    geometry: {draw: vi.fn()},
    gl,
    renderTarget: targets,
    runners: {contextChange: {add: vi.fn()}},
    texture: {bind: vi.fn()},
  } as unknown as WebGLRenderer
  adaptor.init(renderer, renderer.renderTarget)
  configureResolvedTargets(renderer)
  configureFilterResolves(renderer)
  const filter = new ColorMatrixFilter()
  const filterEffect = new FilterEffect()
  filterEffect.filters = [filter]
  const instruction = {
    action: 'pushFilter' as const,
    canBundle: false,
    container: new Container(),
    filterEffect,
    renderPipeId: 'filter' as const,
  }
  return {adaptor, apply, buffers, filter, gl, input, instruction, output, push, renderer, targets}
}

describe('configureFilterResolves', () => {
  test('should resolve filter input before sampling and defer output until it is read', () => {
    const {adaptor, apply, filter, gl, input, output, renderer, targets} = createRenderer()
    apply.mockImplementation(() => {
      expect(gl.blitFramebuffer).toHaveBeenCalledTimes(1)
      targets.renderTarget = targets.getRenderTarget(output)
      renderer.geometry.draw('triangle-list', 3, 0)
      adaptor.finishRenderPass(targets.renderTarget)
    })
    renderer.filter.applyFilter(filter, input, output, false)
    expect(gl.blitFramebuffer).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledExactlyOnceWith(filter, input, output, false)
    adaptor.finishRenderPass(targets.renderTarget)
    expect(gl.blitFramebuffer).toHaveBeenCalledTimes(2)
    expect(gl.blitFramebuffer).toHaveBeenLastCalledWith(0, 0, 64, 48, 0, 0, 64, 48, 1, 3)
  })

  test('should resolve an intermediate output before the following filter samples it', () => {
    const {adaptor, apply, filter, gl, input, output, renderer, targets} = createRenderer()
    apply.mockImplementation(() => {
      targets.renderTarget = targets.getRenderTarget(output)
      renderer.geometry.draw('triangle-list', 3, 0)
      adaptor.finishRenderPass(targets.renderTarget)
    })
    renderer.filter.applyFilter(filter, input, output, true)
    apply.mockImplementation(() => {
      expect(gl.blitFramebuffer).toHaveBeenCalledTimes(2)
    })
    renderer.filter.applyFilter(filter, output, input, false)
  })

  test('should sample nonmultisampled textures without creating render targets for them', () => {
    const {apply, filter, input, output, renderer, targets} = createRenderer()
    input.source.antialias = false
    const getTarget = vi.spyOn(targets, 'getRenderTarget')
    renderer.filter.applyFilter(filter, input, output, false)
    expect(getTarget).not.toHaveBeenCalled()
    expect(apply).toHaveBeenCalledExactlyOnceWith(filter, input, output, false)
  })

  test('should resolve only the requested backdrop pixels without marking the whole target resolved', () => {
    const {adaptor, buffers, gl, input, instruction, output, push, renderer, targets} =
      createRenderer()
    const source = targets.getRenderTarget(input)
    const gpu = buffers.get(source)!
    push.mockImplementation(() => {
      adaptor.finishRenderPass(source)
      const copied = adaptor.copyToTexture(
        source,
        output,
        {x: 7, y: 9},
        {height: 12, width: 16},
        {
          x: 0,
          y: 0,
        },
      )
      expect(copied).toBe(output)
    })
    renderer.filter.push(instruction)
    expect(gl.blitFramebuffer).toHaveBeenCalledExactlyOnceWith(7, 9, 23, 21, 7, 9, 23, 21, 1, 3)
    expect(gl.bindFramebuffer).toHaveBeenLastCalledWith(
      gl.FRAMEBUFFER,
      gpu.resolveTargetFramebuffer,
    )
    expect(gl.copyTexSubImage2D).toHaveBeenCalledExactlyOnceWith(5, 0, 0, 0, 7, 9, 16, 12)
    adaptor.finishRenderPass(source)
    expect(gl.blitFramebuffer).toHaveBeenLastCalledWith(0, 0, 64, 48, 0, 0, 64, 48, 1, 3)
    expect(gl.blitFramebuffer).toHaveBeenCalledTimes(2)
  })

  test('should retain copying without MSAA and leave buffer dimensions and sampling unchanged', () => {
    const {adaptor, buffers, gl, input, output, targets} = createRenderer()
    const source = targets.getRenderTarget(input)
    buffers.get(source)!.msaa = false
    adaptor.copyToTexture(source, output, {x: 1, y: 2}, {height: 3, width: 4}, {x: 0, y: 0})
    expect(gl.blitFramebuffer).not.toHaveBeenCalled()
    expect(gl.copyTexSubImage2D).toHaveBeenCalledExactlyOnceWith(5, 0, 0, 0, 1, 2, 4, 3)
    expect(input.source.antialias).toBe(true)
    expect([input.source.pixelWidth, input.source.pixelHeight]).toEqual([64, 48])
  })

  test('should restore resolve handling after a filter fails', () => {
    const {adaptor, apply, filter, gl, input, output, renderer, targets} = createRenderer()
    const error = new Error('draw failed')
    apply.mockImplementation(() => {
      targets.renderTarget = targets.getRenderTarget(output)
      renderer.geometry.draw('triangle-list', 3, 0)
      throw error
    })
    expect(() => renderer.filter.applyFilter(filter, input, output, false)).toThrow(error)
    adaptor.finishRenderPass(targets.renderTarget)
    expect(gl.blitFramebuffer).toHaveBeenCalledTimes(2)
  })

  test('should restore region and filter scopes after backdrop copying fails', () => {
    const {adaptor, gl, input, instruction, output, push, renderer, targets} = createRenderer()
    const source = targets.getRenderTarget(input)
    const error = new Error('copy failed')
    gl.copyTexSubImage2D.mockImplementationOnce(() => {
      throw error
    })
    push.mockImplementation(() => {
      adaptor.copyToTexture(source, output, {x: 1, y: 2}, {height: 3, width: 4}, {x: 0, y: 0})
    })
    expect(() => renderer.filter.push(instruction)).toThrow(error)
    adaptor.finishRenderPass(source)
    expect(gl.blitFramebuffer).toHaveBeenLastCalledWith(0, 0, 64, 48, 0, 0, 64, 48, 1, 3)
  })

  test('should restore the draw framebuffer and allow a full resolve after a partial resolve fails', () => {
    const {adaptor, buffers, gl, input, output, targets} = createRenderer()
    const source = targets.getRenderTarget(input)
    const error = new Error('resolve failed')
    gl.blitFramebuffer.mockImplementationOnce(() => {
      throw error
    })
    expect(() =>
      adaptor.copyToTexture(source, output, {x: 1, y: 2}, {height: 3, width: 4}, {x: 0, y: 0}),
    ).toThrow(error)
    expect(gl.bindFramebuffer).toHaveBeenLastCalledWith(
      gl.FRAMEBUFFER,
      buffers.get(source)!.framebuffer,
    )
    expect(gl.copyTexSubImage2D).not.toHaveBeenCalled()
    adaptor.finishRenderPass(source)
    expect(gl.blitFramebuffer).toHaveBeenLastCalledWith(0, 0, 64, 48, 0, 0, 64, 48, 1, 3)
  })
})
