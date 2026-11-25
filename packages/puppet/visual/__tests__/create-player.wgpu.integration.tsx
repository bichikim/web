import {afterEach, expect, test, vi} from 'vitest'
import {
  createDemoDocument,
  createEmptyDocument,
  createPlayer,
  flushPlayerInputs,
  type FrameAlphaSample,
  parseDocument,
  type Player,
  type PlayerAlphaCapture,
  type PlayerRendererPreference,
  type PuppetDocument,
  serializeDocument,
} from '../../src/player'

const players: Player[] = []
afterEach(() => {
  players.splice(0).forEach((player) => player.destroy())
  document.body.replaceChildren()
})
const pixels = (canvas: HTMLCanvasElement) => {
  const copy = new OffscreenCanvas(canvas.width, canvas.height)
  const context = copy.getContext('2d')!
  context.drawImage(canvas, 0, 0)
  return context.getImageData(0, 0, canvas.width, canvas.height).data
}
const prepared = (source: PuppetDocument) => {
  const parsed = parseDocument(serializeDocument(source))
  if (!parsed.ok) {
    throw new Error(`Invalid GPU fixture: ${JSON.stringify(parsed)}`)
  }
  return parsed.document
}
const prepare = async (
  invertedMask: boolean,
  alphaCapture?: PlayerAlphaCapture,
  renderer: PlayerRendererPreference = 'wgpu',
) => {
  const source = createDemoDocument()
  const host = document.createElement('div')
  Object.defineProperties(host, {clientHeight: {value: 200}, clientWidth: {value: 200}})
  document.body.append(host)
  const canvas = document.createElement('canvas')
  host.append(canvas)
  const player = await createPlayer({
    alphaCapture,
    buffering: false,
    canvas,
    document: prepared({
      ...source,
      motions: [],
      parameterBindings: [],
      parts: source.parts.map((part) => {
        if (part.id === 'shape-circle') {
          return {...part, properties: {clippingMaskIds: ['shape-diamond'], invertedMask}}
        }
        return part.id === 'shape-diamond'
          ? {...part, properties: {clippingMaskIds: ['mesh-preview']}}
          : part
      }),
    }),
    renderer,
    resizeTo: host,
    resolution: 1,
  })
  players.push(player)
  player.pause()
  player.redraw()
  return {canvas, host, player}
}

const adapter = await navigator.gpu?.requestAdapter()
const gpuTest = test.skipIf(adapter === undefined || adapter === null)

gpuTest(
  'should release converted textures and recover with Pixi after a conversion failure',
  async () => {
    const convert = globalThis.createImageBitmap.bind(globalThis)
    const closed = vi.fn()
    let converted: Promise<ImageBitmap> | undefined
    const spy = vi
      .spyOn(globalThis, 'createImageBitmap')
      .mockImplementationOnce((image) => {
        converted = convert(image).then((bitmap) => {
          const close = bitmap.close.bind(bitmap)
          bitmap.close = () => {
            closed()
            close()
          }
          return bitmap
        })
        return converted
      })
      .mockRejectedValueOnce(new Error('Browser texture conversion failed'))
    try {
      const {canvas, player} = await prepare(false, undefined, 'auto')
      await flushPlayerInputs(player)
      expect(converted).toBeDefined()
      await converted
      expect(player.getRenderingInfo().renderer).toBe('webgl')
      expect(pixels(canvas).some((value, index) => index % 4 === 3 && value > 0)).toBe(true)
      expect(closed).toHaveBeenCalledOnce()
    } finally {
      spy.mockRestore()
    }
  },
)

gpuTest('should initialize the supported browser wgpu renderer in auto mode', async () => {
  const {canvas, player} = await prepare(false, undefined, 'auto')
  await flushPlayerInputs(player)
  expect(player.getRenderingInfo()).toMatchObject({renderer: 'webgpu', runtime: 'wgpu'})
  expect(pixels(canvas).some((value, index) => index % 4 === 3 && value > 0)).toBe(true)
})

gpuTest(
  'should sample the alpha of the resolved frame while preserving its color image',
  async () => {
    let onSample = (_sample: FrameAlphaSample) => {}
    let onError = (_error: Error) => {}
    const result = new Promise<FrameAlphaSample>((resolve, reject) => {
      onSample = resolve
      onError = reject
    })
    const {canvas, player} = await prepare(false, {
      onError,
      onSample,
      requestSize: () => ({height: 200, width: 200}),
    })
    await flushPlayerInputs(player)
    const {data, height, width} = await result
    const shown = pixels(canvas)
    expect({height, width}).toEqual({height: 200, width: 200})
    expect(data).toContain(0)
    expect(data).toContain(255)
    expect(data).toEqual(Uint8Array.from(shown.filter((_, index) => index % 4 === 3)))
  },
)

gpuTest('should cull reversed triangles when rest-area products nearly cancel', async () => {
  const host = document.createElement('div')
  Object.defineProperties(host, {clientHeight: {value: 100}, clientWidth: {value: 100}})
  document.body.append(host)
  const canvas = document.createElement('canvas')
  host.append(canvas)
  const rest = [0, 0, 100000, 100001, 100001, 100002]
  const player = await createPlayer({
    buffering: false,
    canvas,
    document: prepared({
      ...createEmptyDocument(),
      parameterBindings: [
        {
          id: 'pose',
          keyforms: [
            {parts: [{partId: 'part', vertices: rest}], values: [0]},
            {parts: [{partId: 'part', vertices: [0, 0, 100, 0, 0, 100]}], values: [1]},
          ],
          parameterIds: ['pose'],
          targetPartIds: ['part'],
        },
      ],
      parameters: [{defaultValue: 0, id: 'pose', maximum: 1, minimum: 0, name: 'Pose'}],
      parts: [
        {
          id: 'part',
          mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: rest},
          properties: {culling: true},
          texture: {
            height: 1,
            src: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3Cpath fill="white" d="M0 0H1V1H0z"/%3E%3C/svg%3E',
            width: 1,
          },
        },
      ],
      scene: {roots: [{id: 'part', kind: 'part', locked: false, name: 'Part', visible: true}]},
      viewport: {height: 100, width: 100},
    }),
    renderer: 'wgpu',
    resizeTo: host,
    resolution: 1,
  })
  players.push(player)
  player.pause()
  player.setParameterValue('pose', 1)
  await flushPlayerInputs(player)
  const actual = pixels(canvas)
  const replacement = document.createElement('canvas')
  host.append(replacement)
  await player.configureRenderer({canvas: replacement, renderer: 'pixi-webgl'})
  player.redraw()
  const reference = pixels(replacement)
  const inside = (25 * 100 + 25) * 4 + 3
  expect(reference[inside]).toBe(0)
  expect(actual[inside]).toBe(reference[inside])
})

gpuTest.each([false, true])(
  'should preserve nested mask coverage with inverted=%s',
  async (inverted) => {
    const {canvas, host, player} = await prepare(inverted)
    expect(player.getRenderingInfo()).toMatchObject({renderer: 'webgpu', runtime: 'wgpu'})
    await flushPlayerInputs(player)
    const actual = pixels(canvas)
    // A renderer replacement waits for its GPU image before publishing the new Canvas.
    const replacement = document.createElement('canvas')
    host.append(replacement)
    await player.configureRenderer({canvas: replacement, renderer: 'pixi-webgl'})
    player.redraw()
    const reference = pixels(replacement)
    let difference = 0
    let covered = 0
    for (let index = 0; index < reference.length; index += 1) {
      difference += Math.abs(actual[index]! - reference[index]!)
      covered += Number(reference[index]! > 0)
    }
    expect(covered).toBeGreaterThan(100)
    expect(difference / reference.length).toBeLessThan(1)
  },
)

gpuTest.each(['mask-only', 'invisible', 'transparent', 'culled'] as const)(
  'should preserve mask coverage independently of source display state: %s',
  async (mode) => {
    const host = document.createElement('div')
    Object.defineProperties(host, {clientHeight: {value: 100}, clientWidth: {value: 100}})
    document.body.append(host)
    const canvas = document.createElement('canvas')
    host.append(canvas)
    const vertices = [0, 0, 50, 0, 0, 100, 50, 100]
    const mesh = {indices: [0, 1, 2, 1, 3, 2], uvs: [0, 0, 1, 0, 0, 1, 1, 1], vertices}
    const texture = {
      height: 1,
      src: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3Cpath fill="white" d="M0 0H1V1H0z"/%3E%3C/svg%3E',
      width: 1,
    }
    const source: PuppetDocument = {
      ...createEmptyDocument(),
      parameterBindings: [
        {
          id: 'mirror',
          keyforms: [
            {parts: [{partId: 'mask', vertices}], values: [0]},
            {
              parts: [
                {
                  partId: 'mask',
                  vertices: vertices.map((value, index) => (index % 2 === 0 ? 50 - value : value)),
                },
              ],
              values: [1],
            },
          ],
          parameterIds: ['flip'],
          targetPartIds: ['mask'],
        },
      ],
      parameters: [{defaultValue: 0, id: 'flip', maximum: 1, minimum: 0, name: 'Flip'}],
      parts: [
        {
          id: 'receiver',
          mesh: {...mesh, vertices: [0, 0, 100, 0, 0, 100, 100, 100]},
          properties: {clippingMaskIds: ['mask']},
          texture,
        },
        {
          id: 'mask',
          mesh,
          properties: {
            culling: mode === 'culled',
            opacity: mode === 'transparent' ? 0 : 1,
            renderWhenUsedAsMask: mode !== 'mask-only',
          },
          texture,
        },
      ],
      scene: {
        roots: ['receiver', 'mask'].map((id) => ({
          id,
          kind: 'part',
          locked: false,
          name: id,
          visible: id !== 'mask' || mode !== 'invisible',
        })),
      },
      viewport: {height: 100, width: 100},
    }
    const player = await createPlayer({
      buffering: false,
      canvas,
      document: prepared(source),
      renderer: 'wgpu',
      resizeTo: host,
      resolution: 1,
    })
    players.push(player)
    player.pause()
    if (mode === 'culled') {
      player.setParameterValue('flip', 1)
    }
    player.redraw()
    await flushPlayerInputs(player)
    const actual = pixels(canvas)
    const actualPick = player.pickPart({x: 25, y: 50})
    const replacement = document.createElement('canvas')
    host.append(replacement)
    await player.configureRenderer({canvas: replacement, renderer: 'pixi-webgl'})
    player.redraw()
    const reference = pixels(replacement)
    const inside = (50 * 100 + 25) * 4 + 3
    const outside = (50 * 100 + 75) * 4 + 3
    expect(reference[inside]).toBe(255)
    expect(reference[outside]).toBe(0)
    expect(actual[inside]).toBe(reference[inside])
    expect(actual[outside]).toBe(reference[outside])
    expect(player.pickPart({x: 25, y: 50})).toBe('receiver')
    expect(actualPick).toBe('receiver')
  },
)

gpuTest(
  'should settle buffered Rust inputs after canvas display during continuous playback',
  async () => {
    const canvas = document.createElement('canvas')
    let submissions = 0
    let complete = () => {}
    const displayed = new Promise<void>((resolve) => {
      complete = resolve
    })
    try {
      const player = await createPlayer({
        buffering: true,
        canvas,
        document: prepared(createDemoDocument()),
        onAfterRender: () => {
          submissions += 1
          if (submissions >= 12) {
            complete()
          }
        },
        renderer: 'wgpu',
        workerRuntime: 'rust',
      })
      players.push(player)
      await displayed
      player.pause()
      await expect(flushPlayerInputs(player)).resolves.toBe('applied')
      expect(player.getRenderingInfo().runtime).toBe('wgpu')
      expect(submissions).toBeGreaterThanOrEqual(12)
      expect(pixels(canvas).some((value, index) => index % 4 === 3 && value > 0)).toBe(true)
    } finally {
      players.splice(0).forEach((player) => player.destroy())
      vi.restoreAllMocks()
    }
  },
)

gpuTest.each(['auto', 'wgpu'] as const)(
  'should handle a rejected GPU Worker initialization in %s mode',
  async (renderer) => {
    const Original = Worker
    let failed = false
    vi.stubGlobal(
      'Worker',
      class extends Original {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          if (String(url).includes('gpu-worker')) {
            this.postMessage = () => {
              failed = true
              queueMicrotask(() =>
                this.dispatchEvent(
                  new ErrorEvent('error', {message: 'GPU initialization rejected'}),
                ),
              )
            }
          }
        }
      },
    )
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    try {
      const model = prepared(createDemoDocument())
      const options = {buffering: false, canvas, document: model}
      const initial = createPlayer({...options, renderer})
      if (renderer === 'wgpu') {
        await expect(initial).rejects.toThrow('GPU initialization rejected')
      }
      const player = await (renderer === 'auto'
        ? initial
        : createPlayer({...options, renderer: 'pixi'}))
      expect(failed).toBe(true)
      players.push(player)
      await flushPlayerInputs(player)
      expect(player.getRenderingInfo().renderer).toBe('webgl')
      expect(pixels(canvas).some((value, index) => index % 4 === 3 && value > 0)).toBe(true)
    } finally {
      vi.unstubAllGlobals()
    }
  },
)
