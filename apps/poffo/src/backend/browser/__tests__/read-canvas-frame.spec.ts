/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {readCanvasFrame} from '../read-canvas-frame'

afterEach(() => vi.restoreAllMocks())

const createContext = () => ({
  FRAMEBUFFER: 0x8d40,
  FRAMEBUFFER_BINDING: 0x8ca6,
  READ_FRAMEBUFFER: 0x8ca8,
  bindFramebuffer: vi.fn(),
  READ_FRAMEBUFFER_BINDING: 0x8caa,
  getParameter: vi.fn(),
  RGBA: 0x1908,
  isContextLost: vi.fn(() => false),
  UNSIGNED_BYTE: 0x1401,
  readPixels: vi.fn(),
})

test('should read the completed drawing buffer and restore the read framebuffer', () => {
  const gl = createContext()
  const previous = {}
  gl.getParameter.mockReturnValue(previous)
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
  expect(gl.getParameter).toHaveBeenCalledExactlyOnceWith(gl.READ_FRAMEBUFFER_BINDING)
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
    [gl.READ_FRAMEBUFFER, previous],
  ])
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
