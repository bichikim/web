import type {GlRenderTarget, WebGLRenderer} from 'pixi.js'

const configured = new WeakSet<WebGLRenderer>()

/** Reuses resolved MSAA pixels until their draw buffer changes; scoped to one renderer. */
export const configureResolvedTargets = (renderer: WebGLRenderer): void => {
  if (configured.has(renderer)) {
    return
  }
  configured.add(renderer)
  const {geometry, renderTarget: targets} = renderer
  const {adaptor} = targets
  let resolved = new WeakSet<GlRenderTarget>()
  const finish = adaptor.finishRenderPass
  adaptor.finishRenderPass = (target) => {
    if (target === undefined) {
      return finish.call(adaptor, target)
    }
    const gpu = targets.getGpuRenderTarget(target)
    if (resolved.has(gpu)) {
      // PixiJS 8.22 also restores the draw framebuffer when finishing a pass.
      if (gpu.msaa && target.colorAttachments.length > 0) {
        adaptor.bindFramebuffer(gpu.framebuffer)
      }
      return
    }
    finish.call(adaptor, target)
    resolved.add(gpu)
  }
  const {draw} = geometry
  geometry.draw = (...args) => {
    resolved.delete(targets.getGpuRenderTarget(targets.renderTarget))
    return draw.apply(geometry, args)
  }
  const {clear} = adaptor
  adaptor.clear = (target, flag, ...args) => {
    if (flag) {
      resolved.delete(targets.getGpuRenderTarget(target))
    }
    return clear.call(adaptor, target, flag, ...args)
  }
  const resize = adaptor.resizeGpuRenderTarget
  adaptor.resizeGpuRenderTarget = (target) => {
    resolved.delete(targets.getGpuRenderTarget(target))
    return resize.call(adaptor, target)
  }
  const reset = adaptor.resetState
  adaptor.resetState = () => {
    // Three.js or another renderer can change a shared context outside Pixi's draw path.
    resolved = new WeakSet()
    reset.call(adaptor)
  }
}
