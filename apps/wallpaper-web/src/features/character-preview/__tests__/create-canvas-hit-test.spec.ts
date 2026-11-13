/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createCanvasHitTest} from '../create-canvas-hit-test'

afterEach(() => vi.restoreAllMocks())

const setup = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 600
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 200, 300))
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({data: Uint8ClampedArray.of(0, 0, 0, 255)}),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
    kind === '2d' ? context : null) as typeof canvas.getContext)
  const redraw = vi.fn()
  const hitTest = createCanvasHitTest({canvas, redraw})
  return {canvas, context, hitTest, redraw}
}

test('should redraw and sample the visible pixel in backing coordinates at the current canvas position', () => {
  const {canvas, context, hitTest, redraw} = setup()
  expect(hitTest({clientX: 150, clientY: 250})).toBe(true)
  expect(redraw).toHaveBeenCalledOnce()
  expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(canvas, 100, 100, 1, 1, 0, 0, 1, 1)
  expect(context.getImageData).toHaveBeenCalledExactlyOnceWith(0, 0, 1, 1)
  vi.mocked(canvas.getBoundingClientRect).mockReturnValue(new DOMRect(200, 250, 400, 600))
  expect(hitTest({clientX: 250, clientY: 300})).toBe(true)
  expect(context.drawImage).toHaveBeenLastCalledWith(canvas, 50, 50, 1, 1, 0, 0, 1, 1)
})

test('should reject transparent pixels after a previous opaque hit', () => {
  const {context, hitTest} = setup()
  expect(hitTest({clientX: 150, clientY: 250})).toBe(true)
  context.getImageData.mockReturnValueOnce({data: Uint8ClampedArray.of(255, 255, 255, 0)})
  expect(hitTest({clientX: 151, clientY: 251})).toBe(false)
  expect(context.clearRect).toHaveBeenCalledTimes(2)
})

test('should reject points outside the canvas and collapsed layout without rendering', () => {
  const {canvas, hitTest, redraw} = setup()
  expect(hitTest({clientX: 99, clientY: 250})).toBe(false)
  expect(hitTest({clientX: 300, clientY: 250})).toBe(false)
  expect(hitTest({clientX: 150, clientY: 199})).toBe(false)
  expect(hitTest({clientX: 150, clientY: 500})).toBe(false)
  vi.mocked(canvas.getBoundingClientRect).mockReturnValue(new DOMRect(100, 200, 0, 0))
  expect(hitTest({clientX: 100, clientY: 200})).toBe(false)
  expect(redraw).not.toHaveBeenCalled()
})

test('should reject hits if the canvas cannot be read instead of enabling the transparent rectangle', () => {
  const {context, hitTest} = setup()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  context.getImageData.mockImplementationOnce(() => {
    throw new Error('Unreadable canvas')
  })
  expect(hitTest({clientX: 150, clientY: 250})).toBe(false)
  expect(hitTest({clientX: 150, clientY: 250})).toBe(false)
  expect(context.getImageData).toHaveBeenCalledOnce()
})
