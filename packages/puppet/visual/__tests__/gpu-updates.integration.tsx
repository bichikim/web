import {afterEach, expect, test, vi} from 'vitest'
import initialize, {CanvasRenderer} from '../../src/player/rendering/wgpu/wasm/runtime'

const renderers: CanvasRenderer[] = []
afterEach(() => {
  vi.restoreAllMocks()
  renderers.splice(0).forEach((renderer) => renderer.free())
  document.body.replaceChildren()
})
const adapter = await navigator.gpu?.requestAdapter()
const gpuTest = test.skipIf(adapter === null || adapter === undefined)

const prepare = async (textures = [0, 0]) => {
  await initialize()
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  document.body.append(canvas)
  const quad = [0, 0, 32, 0, 32, 32, 0, 32]
  const renderer = await CanvasRenderer.create(
    canvas,
    64,
    64,
    JSON.stringify({
      parts: textures.map((texture, index) => ({
        id: `part-${index}`,
        indices: [0, 1, 2, 0, 2, 3],
        texture,
        uvs: [0, 0, 1, 0, 1, 1, 0, 1],
        vertices: quad,
      })),
      plans: textures.map((_, index) => ({
        layerIds: [],
        mask: null,
        partId: `part-${index}`,
        properties: {alphaBlendMode: 'over', blendMode: 'normal'},
      })),
      viewport: {height: 32, width: 32},
    }),
    4,
  )
  renderers.push(renderer)
  const images = await Promise.all(
    [
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ].map((color) => createImageBitmap(new ImageData(new Uint8ClampedArray(color), 1, 1))),
  )
  images.forEach((image) => {
    renderer.texture(image)
    image.close()
  })
  return {
    canvas,
    display: new Float32Array(
      textures.flatMap((_, index) => [index, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]),
    ),
    renderer,
    vertices: new Float32Array(textures.flatMap(() => quad)),
  }
}

const pixels = (canvas: HTMLCanvasElement) => {
  const copy = new OffscreenCanvas(canvas.width, canvas.height)
  const context = copy.getContext('2d')!
  context.drawImage(canvas, 0, 0)
  return context.getImageData(0, 0, canvas.width, canvas.height).data
}

gpuTest('should avoid GPU buffer writes when a rendered frame has not changed', async () => {
  const {renderer, vertices, display} = await prepare()
  renderer.draw(vertices, display)
  const writes = vi.spyOn(GPUQueue.prototype, 'writeBuffer')
  renderer.draw(vertices, display)
  expect(writes).not.toHaveBeenCalled()
})

gpuTest(
  'should upload only the changed coordinate without rewriting indices or uniforms',
  async () => {
    const {renderer, vertices, display} = await prepare()
    renderer.draw(vertices, display)
    const writes = vi.spyOn(GPUQueue.prototype, 'writeBuffer')
    vertices[2] = 31
    renderer.draw(vertices, display)
    expect(
      writes.mock.calls.map(([buffer, offset, data]) => [buffer.label, offset, data.byteLength]),
    ).toEqual([['deformed positions', 8, 4]])
  },
)

gpuTest(
  'should batch adjacent GPU state changes while preserving individual pass draws',
  async () => {
    const {renderer, vertices, display} = await prepare()
    const drawn = vi.spyOn(GPURenderPassEncoder.prototype, 'drawIndexed')
    const pipelines = vi.spyOn(GPURenderPassEncoder.prototype, 'setPipeline')
    const groups = vi.spyOn(GPURenderPassEncoder.prototype, 'setBindGroup')
    renderer.draw(vertices, display)
    expect(drawn).toHaveBeenCalledTimes(2)
    // One character batch and the final presentation.
    expect(pipelines).toHaveBeenCalledTimes(2)
    expect(groups.mock.calls.filter(([index]) => index === 1)).toHaveLength(1)
    expect(groups.mock.calls.filter(([index]) => index === 2)).toHaveLength(1)
    drawn.mockClear()
    vertices[2] = 31
    display[3] = 0.5
    renderer.draw(vertices, display)
    expect(drawn).toHaveBeenCalledTimes(2)
  },
)

gpuTest('should update ordered GPU batches when paint order or visibility changes', async () => {
  const {renderer, vertices, display} = await prepare([0, 1, 0])
  renderer.draw(vertices, display)
  const encoded = vi.spyOn(GPURenderPassEncoder.prototype, 'drawIndexed')
  const reversed = new Float32Array([
    ...display.slice(26),
    ...display.slice(13, 26),
    ...display.slice(0, 13),
  ])
  renderer.draw(vertices, reversed)
  expect(encoded).toHaveBeenCalledTimes(3)
  encoded.mockClear()
  reversed[1] = 0
  renderer.draw(vertices, reversed)
  expect(encoded).toHaveBeenCalledTimes(2)
})

gpuTest('should rebuild drawing state after resize and restore the original pixels', async () => {
  const {canvas, renderer, vertices, display} = await prepare()
  renderer.draw(vertices, display)
  const expected = pixels(canvas)
  const encoded = vi.spyOn(GPURenderPassEncoder.prototype, 'drawIndexed')
  canvas.width = 96
  renderer.resize(96, 64)
  renderer.draw(vertices, display)
  expect(encoded).toHaveBeenCalledTimes(2)
  canvas.width = 64
  renderer.resize(64, 64)
  renderer.draw(vertices, display)
  expect(pixels(canvas)).toEqual(expected)
})

gpuTest(
  'should retain A B A paint order rather than sorting parts into texture batches',
  async () => {
    const {canvas, renderer, vertices, display} = await prepare([0, 1, 0])
    renderer.draw(vertices, display)
    expect(JSON.parse(renderer.info()).draws).toBe(3)
    const image = pixels(canvas)
    const center = (32 * 64 + 32) * 4
    expect(Array.from(image.slice(center, center + 4))).toEqual([255, 0, 0, 255])
  },
)

gpuTest(
  'should update and restore opacity, visibility and camera without stale batched data',
  async () => {
    const {canvas, renderer, vertices, display} = await prepare()
    display[3] = 0.5
    display[16] = 0.5
    renderer.draw(vertices, display)
    const expected = pixels(canvas)
    display[3] = 0.25
    display[14] = 0
    renderer.view(0.03, -0.03, -0.5, 0.5)
    renderer.draw(vertices, display)
    expect(pixels(canvas)).not.toEqual(expected)
    display[3] = 0.5
    display[14] = 1
    renderer.view(0.0625, -0.0625, -1, 1)
    renderer.draw(vertices, display)
    expect(pixels(canvas)).toEqual(expected)
    expect(JSON.parse(renderer.info()).draws).toBe(2)
  },
)
