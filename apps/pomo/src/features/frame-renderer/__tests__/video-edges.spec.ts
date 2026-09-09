/** @vitest-environment jsdom */
import {Container, type Renderer, Texture} from 'pixi.js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {VideoEdges} from '../video-edges'

vi.mock('../../video-background', async () => {
  const timeline = await import('../../video-background/timeline')
  return {
    ...timeline,
    captureSample: () => ({height: 1, pixels: new Uint8ClampedArray(4), time: 0, width: 1}),
  }
})
vi.mock('../edges', () => ({
  PhotoEdges: class {
    view = new Container()
    resize() {}
    destroy() {
      this.view.destroy()
    }
  },
}))
let now = 0
beforeEach(() => {
  now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(Texture, 'from').mockImplementation(() => new Texture())
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: () => ({data: new Uint8ClampedArray(4)}),
    putImageData: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
})
afterEach(() => vi.restoreAllMocks())
const setup = () => {
  const generateTexture = vi.fn(() => new Texture())
  const edges = new VideoEdges(
    {generateTexture} as unknown as Renderer,
    document.createElement('video'),
  )
  edges.resize({height: 600, photoHeight: 600, photoWidth: 400, width: 800})
  return {edges, generateTexture}
}
const samples = [0, 5, 10].map((time) => ({
  height: 1,
  pixels: new Uint8ClampedArray(4),
  time,
  width: 1,
}))
it('should fade from the visible background when analysis arrives', () => {
  const {edges, generateTexture} = setup()
  edges.setSamples(samples)
  const overlay = edges.view.children.at(-1)!
  expect(overlay.alpha).toBe(1)
  now = 350
  edges.update(2.5)
  expect(overlay.alpha).toBeCloseTo(0.5)
  expect(generateTexture).toHaveBeenCalledOnce()
  now = 700
  edges.update(3)
  expect(overlay.destroyed).toBe(true)
  edges.destroy()
})
it('should preserve ordinary interpolation without capturing every update and fade on rewind', () => {
  const {edges, generateTexture} = setup()
  edges.setSamples(samples)
  now = 700
  edges.update(7.5)
  expect(edges.view.children[1].alpha).toBeCloseTo(0.5)
  edges.update(8)
  expect(generateTexture).toHaveBeenCalledOnce()
  edges.update(0)
  const overlay = edges.view.children.at(-1)!
  expect(overlay.alpha).toBe(1)
  expect(generateTexture).toHaveBeenCalledTimes(2)
  now = 1050
  edges.update(0.35)
  expect(overlay.alpha).toBeCloseTo(0.5)
  edges.destroy()
  expect(overlay.destroyed).toBe(true)
})
