import type {Page} from 'playwright/test'

/** Copies known premultiplied bytes to the drawing buffer without a shader or image decoder. */
export const encodingControl = (page: Page) =>
  page.evaluate(() => {
    const SIDE = 256
    const COMPONENTS = 4
    const MAXIMUM = 255
    const ALPHA = 3
    const canvas = document.createElement('canvas')
    canvas.width = SIDE
    canvas.height = SIDE
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    })
    if (gl === null) {
      throw new Error('WebGL2 is unavailable')
    }
    const input = new Uint8Array(SIDE * SIDE * COMPONENTS)
    for (let alpha = 0; alpha < SIDE; alpha += 1) {
      for (let color = 0; color < SIDE; color += 1) {
        const offset = (alpha * SIDE + color) * COMPONENTS
        input[offset] = Math.min(color, alpha)
        input[offset + 1] = Math.min(MAXIMUM - color, alpha)
        input[offset + 2] = Math.min(color, alpha)
        input[offset + ALPHA] = alpha
      }
    }
    const texture = gl.createTexture()
    const framebuffer = gl.createFramebuffer()
    try {
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, SIDE, SIDE, 0, gl.RGBA, gl.UNSIGNED_BYTE, input)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer)
      gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
      gl.blitFramebuffer(0, 0, SIDE, SIDE, 0, 0, SIDE, SIDE, gl.COLOR_BUFFER_BIT, gl.NEAREST)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
      const pixels = new Uint8Array(input.length)
      gl.readPixels(0, 0, SIDE, SIDE, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      return {
        dataUrl: canvas.toDataURL('image/png'),
        error: gl.getError(),
        input: Array.from(input),
        pixels: Array.from(pixels),
      }
    } finally {
      gl.deleteFramebuffer(framebuffer)
      gl.deleteTexture(texture)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.width = 0
      canvas.height = 0
    }
  })
