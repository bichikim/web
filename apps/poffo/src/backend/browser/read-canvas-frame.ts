import type {FramePixels} from '../encode-frame-png'

/** Reads the completed WebGL drawing buffer and restores the previous read framebuffer. */
export const readCanvasFrame = (canvas: HTMLCanvasElement): FramePixels => {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  if (gl === null || gl.isContextLost()) {
    throw new Error('Cannot read the rendered WebGL frame')
  }
  const {height, width} = canvas
  const COMPONENTS = 4
  const pixels = new Uint8Array(width * height * COMPONENTS)
  const webgl2 = 'READ_FRAMEBUFFER' in gl
  const target = webgl2 ? gl.READ_FRAMEBUFFER : gl.FRAMEBUFFER
  const binding = webgl2 ? gl.READ_FRAMEBUFFER_BINDING : gl.FRAMEBUFFER_BINDING
  const previous: WebGLFramebuffer | null = gl.getParameter(binding)
  gl.bindFramebuffer(target, null)
  try {
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return {height, pixels, width}
  } finally {
    gl.bindFramebuffer(target, previous)
  }
}
