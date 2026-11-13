import type {RenderTarget, WebGLRenderer} from 'pixi.js'

interface CopyRegion {
  readonly target: RenderTarget
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const configured = new WeakSet<WebGLRenderer>()

/** Resolves source pixels in place, retaining the target's size and MSAA sample count. */
const resolveCopiedPixels = (renderer: WebGLRenderer, region: CopyRegion): void => {
  const {adaptor} = renderer.renderTarget
  const gpu = renderer.renderTarget.getGpuRenderTarget(region.target)
  if (!gpu.msaa || region.target.colorAttachments.length === 0) {
    return
  }
  const {gl} = renderer
  const {height, width, x, y} = region
  adaptor.bindFramebuffer(gpu.resolveTargetFramebuffer)
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, gpu.framebuffer)
  try {
    gl.blitFramebuffer(
      x,
      y,
      x + width,
      y + height,
      x,
      y,
      x + width,
      y + height,
      gl.COLOR_BUFFER_BIT,
      gl.NEAREST,
    )
  } finally {
    adaptor.bindFramebuffer(gpu.framebuffer)
  }
}

/**
 * Resolves filter pixels when sampled or copied, preserving final presentation resolves.
 * Install after configureResolvedTargets so its cache sees only completed full resolves.
 */
export const configureFilterResolves = (renderer: WebGLRenderer): void => {
  if (configured.has(renderer)) {
    return
  }
  configured.add(renderer)
  const {filter, renderTarget: targets} = renderer
  const {adaptor} = targets
  const finish = adaptor.finishRenderPass
  let deferred = 0
  let copiedRegion: CopyRegion | undefined
  adaptor.finishRenderPass = (target) => {
    if (target !== undefined && copiedRegion?.target === target) {
      // A partial resolve never marks the entire target as resolved in the preceding cache.
      resolveCopiedPixels(renderer, copiedRegion)
    } else if (deferred === 0 || target === undefined) {
      finish.call(adaptor, target)
    }
  }
  const copy = adaptor.copyToTexture
  adaptor.copyToTexture = (source, destination, origin, size, ...args) => {
    const previous = copiedRegion
    copiedRegion = {
      height: size.height,
      target: source,
      width: size.width,
      x: origin.x,
      y: origin.y,
    }
    try {
      return copy.call(adaptor, source, destination, origin, size, ...args)
    } finally {
      copiedRegion = previous
    }
  }
  const {push} = filter
  filter.push = (...args) => {
    // PixiJS 8.22 resolves the whole parent before copying a small backdrop from it.
    deferred += 1
    try {
      return push.apply(filter, args)
    } finally {
      deferred -= 1
    }
  }
  const apply = filter.applyFilter
  filter.applyFilter = (effect, input, ...args) => {
    // Intermediate outputs are resolved here before the next filter reads them.
    if (input.source.antialias) {
      finish.call(adaptor, targets.getRenderTarget(input))
    }
    deferred += 1
    try {
      return apply.call(filter, effect, input, ...args)
    } finally {
      deferred -= 1
    }
  }
}
