import {BatchGeometry, DefaultShader} from 'pixi.js'
import {expect, test} from 'vitest'
import {createGradientGeometry} from '../../src/player/rendering/create-gradient-geometry'
import {createGradientShader} from '../../src/player/rendering/create-gradient-shader'

test('should preserve affine UV gradients bit for bit across fragments and viewport resolutions', () => {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const gl = canvas.getContext('webgl2')!
  expect(gl.getExtension('EXT_color_buffer_float')).not.toBeNull()
  const source = new BatchGeometry()
  source.buffers[0]!.data = new Float32Array([
    4, 4, 0.25, 0.5, 0, 0, 60, 4, 0.75, 0.625, 0, 0, 4, 60, 0.375, 0.875, 0, 0,
  ])
  source.indexBuffer!.data = new Uint32Array([0, 1, 2])
  const expanded = createGradientGeometry(source)
  const material = new DefaultShader(2)
  const shader = createGradientShader(material)
  try {
    expanded.update()
    const program = gl.createProgram()!
    // Read the production vertex shader's sampling gradients before texture filtering.
    const original = shader.glProgram!.fragment!
    const fragment = original.replace(
      'finalColor = outColor * vColor;',
      'finalColor = vUvGradient;',
    )
    expect(fragment).not.toBe(original)
    for (const [type, source] of [
      [gl.VERTEX_SHADER, shader.glProgram!.vertex!],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const compiled = gl.createShader(type)!
      gl.shaderSource(compiled, source)
      gl.compileShader(compiled)
      expect(gl.getShaderInfoLog(compiled)).toBe('')
      expect(gl.getShaderParameter(compiled, gl.COMPILE_STATUS)).toBe(true)
      gl.attachShader(program, compiled)
      gl.deleteShader(compiled)
    }
    gl.linkProgram(program)
    expect(gl.getProgramParameter(program, gl.LINK_STATUS)).toBe(true)
    gl.useProgram(program)
    for (const [name, count] of [
      ['aPosition', 2],
      ['aUvGradient', 4],
    ] as const) {
      const attribute = expanded.geometry.attributes[name]!
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, attribute.buffer.data, gl.STATIC_DRAW)
      const location = gl.getAttribLocation(program, name)
      expect(location).toBeGreaterThanOrEqual(0)
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(
        location,
        count,
        gl.FLOAT,
        false,
        attribute.stride ?? 0,
        attribute.offset ?? 0,
      )
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, expanded.geometry.indexBuffer.data, gl.STATIC_DRAW)
    gl.uniformMatrix3fv(
      gl.getUniformLocation(program, 'uWorldTransformMatrix'),
      false,
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
    )
    gl.uniformMatrix3fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, [
      2 / 64,
      0,
      0,
      0,
      2 / 64,
      0,
      -1,
      -1,
      1,
    ])
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, 128, 128)
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      gl.getParameter(gl.TEXTURE_BINDING_2D),
      0,
    )
    expect(gl.checkFramebufferStatus(gl.FRAMEBUFFER)).toBe(gl.FRAMEBUFFER_COMPLETE)
    const expected = Float32Array.of(1 / 112, 1 / 448, 1 / 448, 3 / 448)
    for (const resolution of [1, 2]) {
      const size = 64 * resolution
      gl.viewport(0, 0, size, size)
      gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), size, size)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_INT, 0)
      for (const [x, y] of [
        [8, 8],
        [16, 16],
        [40, 8],
      ]) {
        const pixels = new Float32Array(4)
        gl.readPixels(x! * resolution, y! * resolution, 1, 1, gl.RGBA, gl.FLOAT, pixels)
        expect(pixels).toEqual(expected.map((value) => value / resolution))
      }
    }
    expect(gl.getError()).toBe(gl.NO_ERROR)
  } finally {
    expanded.destroy()
    source.destroy(true)
    shader.destroy(true)
    material.destroy()
    gl.getExtension('WEBGL_lose_context')!.loseContext()
  }
})
