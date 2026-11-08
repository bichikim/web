import type {Page} from 'playwright/test'

/** Compares implicit canvas resolves with explicit RGBA8 resolves using known half coverage. */
export const resolveControl = (page: Page) =>
  page.evaluate(() => {
    const WIDTH = 256
    const HEIGHT = 1
    const COMPONENTS = 4
    const HALF_COVERAGE = 0.5
    const TRIANGLE_VERTICES = 3
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const gl = canvas.getContext('webgl2', {antialias: true, preserveDrawingBuffer: true})
    if (gl === null) {
      throw new Error('WebGL2 is unavailable')
    }
    const samples: number = gl.getParameter(gl.SAMPLES)
    const vertex = gl.createShader(gl.VERTEX_SHADER)!
    const fragment = gl.createShader(gl.FRAGMENT_SHADER)!
    const program = gl.createProgram()!
    const multisampled = gl.createFramebuffer()
    const storage = gl.createRenderbuffer()
    const resolved = gl.createFramebuffer()
    const texture = gl.createTexture()
    const prepareProgram = () => {
      gl.shaderSource(
        vertex,
        `#version 300 es
void main() {
  vec2 positions[3] = vec2[3](vec2(-1,-1), vec2(3,-1), vec2(-1,3));
  gl_Position = vec4(positions[gl_VertexID], 0, 1);
}`,
      )
      gl.shaderSource(
        fragment,
        `#version 300 es
precision highp float;
out vec4 color;
void main() {
  float value = (gl_FragCoord.x - 0.5) / 255.0;
  color = vec4(value, 1.0-value, value, 1.0);
}`,
      )
      gl.compileShader(vertex)
      gl.compileShader(fragment)
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'Resolve control shader failed')
      }
      gl.useProgram(program)
    }
    const release = () => {
      gl.deleteFramebuffer(multisampled)
      gl.deleteFramebuffer(resolved)
      gl.deleteRenderbuffer(storage)
      gl.deleteTexture(texture)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.width = 0
      canvas.height = 0
    }
    try {
      prepareProgram()
      gl.enable(gl.SAMPLE_COVERAGE)
      gl.sampleCoverage(HALF_COVERAGE, false)
      const draw = () => {
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLES, 0, TRIANGLE_VERTICES)
      }
      const read = () => {
        const pixels = new Uint8Array(WIDTH * HEIGHT * COMPONENTS)
        gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        return Array.from(pixels)
      }
      const resolve = () => {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resolved)
        gl.blitFramebuffer(
          0,
          0,
          WIDTH,
          HEIGHT,
          0,
          0,
          WIDTH,
          HEIGHT,
          gl.COLOR_BUFFER_BIT,
          gl.NEAREST,
        )
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, resolved)
        return read()
      }
      const drawOffscreen = () => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, multisampled)
        gl.bindRenderbuffer(gl.RENDERBUFFER, storage)
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, WIDTH, HEIGHT)
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, storage)
        draw()
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, multisampled)
      }
      draw()
      const implicit = read()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, WIDTH, HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resolved)
      gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      const canvasBlit = resolve()
      drawOffscreen()
      const explicit = resolve()
      return {canvasBlit, error: gl.getError(), explicit, implicit, samples}
    } finally {
      release()
    }
  })
