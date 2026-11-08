import type {FramePixels} from '../encode-frame-png'

const readResolvedPixels = (
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  pixels: Uint8Array,
): void => {
  const read: WebGLFramebuffer | null = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING)
  const draw: WebGLFramebuffer | null = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)
  const bound: WebGLTexture | null = gl.getParameter(gl.TEXTURE_BINDING_2D)
  const clipped = gl.isEnabled(gl.SCISSOR_TEST)
  const framebuffer = gl.createFramebuffer()
  const texture = gl.createTexture()
  try {
    if (framebuffer === null || texture === null) {
      throw new Error('Cannot allocate the frame resolve target')
    }
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    if (gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Cannot complete the frame resolve target')
    }
    gl.disable(gl.SCISSOR_TEST)
    // Implicit canvas readback and explicit blits can round MSAA samples differently.
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
  } finally {
    if (clipped) {
      gl.enable(gl.SCISSOR_TEST)
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, draw)
    gl.bindTexture(gl.TEXTURE_2D, bound)
    gl.deleteFramebuffer(framebuffer)
    gl.deleteTexture(texture)
  }
}

/** Reads the completed drawing buffer through an explicit RGBA8 resolve and restores GL state. */
export const readCanvasFrame = (canvas: HTMLCanvasElement): FramePixels => {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  if (gl === null || gl.isContextLost()) {
    throw new Error('Cannot read the rendered WebGL frame')
  }
  const {height, width} = canvas
  const COMPONENTS = 4
  const pixels = new Uint8Array(width * height * COMPONENTS)
  if ('READ_FRAMEBUFFER' in gl) {
    readResolvedPixels(gl, width, height, pixels)
    return {height, pixels, width}
  }
  const previous: WebGLFramebuffer | null = gl.getParameter(gl.FRAMEBUFFER_BINDING)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  try {
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return {height, pixels, width}
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, previous)
  }
}
