/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {readCanvasFrame} from '../read-canvas-frame'

afterEach(() => vi.restoreAllMocks())

const createContext = () => ({
  bindFramebuffer: vi.fn(),
  bindTexture: vi.fn(),
  blitFramebuffer: vi.fn(),
  checkFramebufferStatus: vi.fn(() => 0x8cd5),
  COLOR_ATTACHMENT0: 0x8ce0,
  COLOR_BUFFER_BIT: 0x4000,
  createFramebuffer: vi.fn<() => object | null>(() => ({})),
  createTexture: vi.fn<() => object | null>(() => ({})),
  deleteFramebuffer: vi.fn(),
  deleteTexture: vi.fn(),
  disable: vi.fn(),
  DRAW_FRAMEBUFFER: 0x8ca9,
  DRAW_FRAMEBUFFER_BINDING: 0x8ca6,
  enable: vi.fn(),
  FRAMEBUFFER: 0x8d40,
  FRAMEBUFFER_BINDING: 0x8ca6,
  FRAMEBUFFER_COMPLETE: 0x8cd5,
  framebufferTexture2D: vi.fn(),
  getParameter: vi.fn(),
  isContextLost: vi.fn(() => false),
  isEnabled: vi.fn(() => false),
  NEAREST: 0x2600,
  READ_FRAMEBUFFER: 0x8ca8,
  READ_FRAMEBUFFER_BINDING: 0x8caa,
  readPixels: vi.fn(),
  RGBA: 0x1908,
  RGBA8: 0x8058,
  SCISSOR_TEST: 0x0c11,
  texImage2D: vi.fn(),
  TEXTURE_2D: 0x0de1,
  TEXTURE_BINDING_2D: 0x8069,
  UNSIGNED_BYTE: 0x1401,
})

test('should read the completed drawing buffer and restore the read framebuffer', () => {
  const gl = createContext()
  const previous = {}
  gl.getParameter.mockReturnValue(previous)
  gl.isEnabled.mockReturnValue(true)
  gl.readPixels.mockImplementation((_x, _y, _width, _height, _format, _type, pixels) => {
    pixels.set([1, 2, 3, 4, 5, 6, 7, 8])
  })
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 1
  vi.spyOn(canvas, 'getContext').mockReturnValue(
    gl as unknown as ReturnType<HTMLCanvasElement['getContext']>,
  )
  const frame = readCanvasFrame(canvas)
  expect(frame).toEqual({height: 1, pixels: Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8), width: 2})
  expect(gl.blitFramebuffer).toHaveBeenCalledExactlyOnceWith(
    0,
    0,
    2,
    1,
    0,
    0,
    2,
    1,
    gl.COLOR_BUFFER_BIT,
    gl.NEAREST,
  )
  expect(gl.readPixels).toHaveBeenCalledExactlyOnceWith(
    0,
    0,
    2,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    expect.any(Uint8Array),
  )
  expect(gl.bindFramebuffer.mock.calls).toEqual([
    [gl.READ_FRAMEBUFFER, null],
    [gl.DRAW_FRAMEBUFFER, gl.createFramebuffer.mock.results[0]!.value],
    [gl.READ_FRAMEBUFFER, gl.createFramebuffer.mock.results[0]!.value],
    [gl.READ_FRAMEBUFFER, previous],
    [gl.DRAW_FRAMEBUFFER, previous],
  ])
  expect(gl.bindTexture).toHaveBeenLastCalledWith(gl.TEXTURE_2D, previous)
  expect(gl.disable).toHaveBeenCalledExactlyOnceWith(gl.SCISSOR_TEST)
  expect(gl.enable).toHaveBeenCalledExactlyOnceWith(gl.SCISSOR_TEST)
  expect(gl.deleteFramebuffer).toHaveBeenCalledExactlyOnceWith(
    gl.createFramebuffer.mock.results[0]!.value,
  )
  expect(gl.deleteTexture).toHaveBeenCalledExactlyOnceWith(gl.createTexture.mock.results[0]!.value)
})

test('should restore a WebGL1 framebuffer when reading fails', () => {
  const {READ_FRAMEBUFFER: _target, READ_FRAMEBUFFER_BINDING: _binding, ...gl} = createContext()
  const previous = {}
  const failure = new Error('read failed')
  gl.getParameter.mockReturnValue(previous)
  gl.readPixels.mockImplementation(() => {
    throw failure
  })
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getContext')
    .mockReturnValueOnce(null)
    .mockReturnValueOnce(gl as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  expect(() => readCanvasFrame(canvas)).toThrow(failure)
  expect(gl.getParameter).toHaveBeenCalledExactlyOnceWith(gl.FRAMEBUFFER_BINDING)
  expect(gl.bindFramebuffer.mock.calls).toEqual([
    [gl.FRAMEBUFFER, null],
    [gl.FRAMEBUFFER, previous],
  ])
})

test.each(['allocation', 'attachment', 'read'] as const)(
  'should restore WebGL2 state and release resolve resources after %s failure',
  (stage) => {
    const gl = createContext()
    const previous = {}
    gl.getParameter.mockReturnValue(previous)
    gl.isEnabled.mockReturnValue(true)
    switch (stage) {
      case 'allocation':
        gl.createTexture.mockReturnValueOnce(null)
        break
      case 'attachment':
        gl.checkFramebufferStatus.mockReturnValueOnce(0)
        break
      case 'read':
        gl.readPixels.mockImplementation(() => {
          throw new Error('read failed')
        })
        break
      default: {
        const exhaustive: never = stage
        throw new Error(`Unknown failure stage: ${exhaustive}`)
      }
    }
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(
      gl as unknown as ReturnType<HTMLCanvasElement['getContext']>,
    )
    expect(() => readCanvasFrame(canvas)).toThrow(Error)
    expect(gl.bindFramebuffer.mock.calls.slice(-2)).toEqual([
      [gl.READ_FRAMEBUFFER, previous],
      [gl.DRAW_FRAMEBUFFER, previous],
    ])
    expect(gl.enable).toHaveBeenCalledExactlyOnceWith(gl.SCISSOR_TEST)
    expect(gl.bindTexture).toHaveBeenLastCalledWith(gl.TEXTURE_2D, previous)
    expect(gl.deleteFramebuffer).toHaveBeenCalledExactlyOnceWith(
      gl.createFramebuffer.mock.results[0]!.value,
    )
    expect(gl.deleteTexture).toHaveBeenCalledExactlyOnceWith(
      gl.createTexture.mock.results[0]!.value,
    )
  },
)

test('should reject missing and lost rendering contexts', () => {
  const canvas = document.createElement('canvas')
  const context = vi.spyOn(canvas, 'getContext').mockReturnValue(null)
  expect(() => readCanvasFrame(canvas)).toThrow('Cannot read the rendered WebGL frame')
  const gl = createContext()
  gl.isContextLost.mockReturnValue(true)
  context.mockReturnValue(gl as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  expect(() => readCanvasFrame(canvas)).toThrow('Cannot read the rendered WebGL frame')
  expect(gl.readPixels).not.toHaveBeenCalled()
})
