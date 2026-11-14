import {expect, test, vi} from 'vitest'
import {cdp} from 'vitest/browser'
import type {CDPSession} from '@vitest/browser-playwright'
import {createEmptyDocument, createPlayer, parseDocumentValue, type Player} from '../../src/player'

const fixture = () => {
  const parts = ['mask', 'receiver'].map((id, index) => ({
    id,
    mesh: {
      boundaryLoops: [[0, 1, 2]],
      indices: [0, 1, 2],
      uvs: [0, 0, 1, 0, 0, 1],
      vertices: [0, 0, 1, 0, 0, 1],
    },
    properties: id === 'mask' ? {renderWhenUsedAsMask: false} : {clippingMaskIds: ['mask']},
    texture: {
      height: 1,
      src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${index === 0 ? 'white' : 'red'}"/></svg>`)}`,
      width: 1,
    },
  }))
  const parsed = parseDocumentValue({
    ...createEmptyDocument(),
    parts,
    scene: {
      roots: parts.map(({id}) => ({id, kind: 'part', locked: false, name: id, visible: true})),
    },
    viewport: {height: 1, width: 1},
  })
  if (!parsed.ok) {
    throw new Error('Invalid mask-only memory fixture')
  }
  return parsed.document
}

test('should release mask-only texture images after repeated player lifetimes', async () => {
  const session: CDPSession = cdp()
  const source = fixture()
  const cycle = async () => {
    const canvas = document.createElement('canvas')
    const player = await createPlayer({canvas, document: source, renderer: 'webgl', resolution: 1})
    player.destroy()
  }
  await session.send('HeapProfiler.enable')
  try {
    await cycle()
    await cycle()
    await session.send('HeapProfiler.collectGarbage')
    const baseline = await session.send('Memory.getDOMCounters')
    for (const _cycle of Array.from({length: 12})) {
      // eslint-disable-next-line no-await-in-loop -- Dispose one owner before creating the next.
      await cycle()
    }
    await session.send('HeapProfiler.collectGarbage')
    const retained = await session.send('Memory.getDOMCounters')
    expect(retained.nodes - baseline.nodes).toBeLessThanOrEqual(2)
    expect(retained.jsEventListeners).toBe(baseline.jsEventListeners)
    expect(retained.documents).toBe(baseline.documents)
  } finally {
    await session.send('HeapProfiler.disable')
  }
}, 15000)

test('should invalidate native GPU buffers, textures and programs when its context is destroyed', async () => {
  const buffers: Array<{gl: WebGL2RenderingContext; value: WebGLBuffer}> = []
  const textures: Array<{gl: WebGL2RenderingContext; value: WebGLTexture}> = []
  const programs: Array<{gl: WebGL2RenderingContext; value: WebGLProgram}> = []
  const original = {
    buffer: WebGL2RenderingContext.prototype.createBuffer,
    program: WebGL2RenderingContext.prototype.createProgram,
    texture: WebGL2RenderingContext.prototype.createTexture,
  }
  vi.spyOn(WebGL2RenderingContext.prototype, 'createBuffer').mockImplementation(
    function create(this: WebGL2RenderingContext) {
      const value = original.buffer.call(this)
      if (value !== null) {
        buffers.push({gl: this, value})
      }
      return value
    },
  )
  vi.spyOn(WebGL2RenderingContext.prototype, 'createTexture').mockImplementation(
    function create(this: WebGL2RenderingContext) {
      const value = original.texture.call(this)
      if (value !== null) {
        textures.push({gl: this, value})
      }
      return value
    },
  )
  vi.spyOn(WebGL2RenderingContext.prototype, 'createProgram').mockImplementation(
    function create(this: WebGL2RenderingContext) {
      const value = original.program.call(this)
      if (value !== null) {
        programs.push({gl: this, value})
      }
      return value
    },
  )
  const canvas = document.createElement('canvas')
  let player: Player | undefined
  try {
    player = await createPlayer({canvas, document: fixture(), renderer: 'webgl', resolution: 1})
    player.redraw()
    expect(buffers.some(({gl, value}) => gl.isBuffer(value))).toBe(true)
    expect(textures.some(({gl, value}) => gl.isTexture(value))).toBe(true)
    expect(programs.some(({gl, value}) => gl.isProgram(value))).toBe(true)
    const lost = new Promise<void>((resolve) => {
      canvas.addEventListener('webglcontextlost', () => resolve(), {once: true})
    })
    player.destroy()
    await lost
    expect(canvas.getContext('webgl2')?.isContextLost()).toBe(true)
    expect(buffers.every(({gl, value}) => !gl.isBuffer(value))).toBe(true)
    expect(textures.every(({gl, value}) => !gl.isTexture(value))).toBe(true)
    expect(programs.every(({gl, value}) => !gl.isProgram(value))).toBe(true)
  } finally {
    player?.destroy()
    vi.restoreAllMocks()
  }
})

test('should release decoded image resources held by retired render batches', async () => {
  const session: CDPSession = cdp()
  const images: Array<WeakRef<HTMLImageElement>> = []
  const NativeImage = globalThis.Image
  const createImage = vi.spyOn(globalThis, 'Image').mockImplementation(function create(
    ...dimensions: ConstructorParameters<typeof Image>
  ) {
    const image = new NativeImage(...dimensions)
    images.push(new WeakRef(image))
    return image
  })
  const count = async () => {
    // Mock result history otherwise owns the real images independently of the renderer.
    createImage.mockClear()
    await session.send('HeapProfiler.collectGarbage')
    return images.filter((image) => image.deref() !== undefined).length
  }
  let player: Player | undefined
  try {
    player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: fixture(),
      renderer: 'webgl',
      resolution: 1,
    })
    player.redraw()
    expect(await count()).toBeGreaterThan(0)
    player.destroy()
    expect(await count()).toBe(0)
  } finally {
    player?.destroy()
    vi.restoreAllMocks()
  }
})

test('should preserve another live player when a player with identical shaders is destroyed', async () => {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const copy = document.createElement('canvas')
  copy.width = 32
  copy.height = 32
  const pixels = () => {
    const context = copy.getContext('2d')!
    context.clearRect(0, 0, 32, 32)
    context.drawImage(canvas, 0, 0)
    return context.getImageData(0, 0, 32, 32).data
  }
  let first: Player | undefined
  let second: Player | undefined
  try {
    first = await createPlayer({
      canvas: document.createElement('canvas'),
      document: fixture(),
      renderer: 'webgl',
      resolution: 1,
    })
    second = await createPlayer({canvas, document: fixture(), renderer: 'webgl', resolution: 1})
    first.stop()
    second.stop()
    first.redraw()
    second.redraw()
    const before = pixels()
    expect(before.some((value) => value > 0)).toBe(true)
    first.destroy()
    second.redraw()
    expect(pixels()).toEqual(before)
  } finally {
    first?.destroy()
    second?.destroy()
  }
})
