/** @vitest-environment jsdom */

import {afterEach, expect, test, vi} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {createPlayer} from '../create-player'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'

const mocks = vi.hoisted(() => ({
  Application: vi.fn(),
  ColorMatrixFilter: vi.fn(),
  Container: vi.fn(),
  MeshSimple: vi.fn(),
  TextureFrom: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  Application: mocks.Application,
  ColorMatrixFilter: mocks.ColorMatrixFilter,
  Container: mocks.Container,
  MeshSimple: mocks.MeshSimple,
  Texture: {from: mocks.TextureFrom},
  UPDATE_PRIORITY: {LOW: -50},
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const square = (id: string, offset: number) => ({
  id,
  mesh: {
    indices: [0, 1, 2, 1, 3, 2],
    uvs: [0, 0, 1, 0, 0, 1, 1, 1],
    vertices: [offset, 0, offset + 10, 0, offset, 10, offset + 10, 10],
  },
  texture: {height: 1, src: `${id}.png`, width: 1},
})

const presetDocument: PuppetDocument = {
  expressions: [
    {
      fadeInTime: 0.5,
      id: 'open',
      parameters: [{blend: 'overwrite', parameterId: 'mouth', value: 1}],
    },
  ],
  format: PUPPET_DOCUMENT_FORMAT,
  hitAreas: [{id: 'body', partIds: ['c']}],
  motions: [],
  parameters: [
    {defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'},
    {defaultValue: 0, id: 'pose', maximum: 1, minimum: 0, name: 'Pose'},
  ],
  parts: [square('a', 0), square('b', 20), square('c', 40)],
  poseGroups: [
    {
      entries: [
        {partIds: ['a'], value: 0},
        {partIds: ['b'], value: 1},
      ],
      id: 'pose',
      parameterId: 'pose',
    },
  ],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 10, width: 50},
}

const setUpRenderer = () => {
  const application = {
    destroy: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
    render: vi.fn(),
    screen: {height: 10, width: 50},
    stage: {addChild: vi.fn()},
    start: vi.fn(),
    stop: vi.fn(),
    ticker: {add: vi.fn()},
  }
  const root = {
    addChild: vi.fn(),
    position: {set: vi.fn()},
    scale: {set: vi.fn()},
    // The stage is offset by ten pixels from document coordinates.
    toLocal: (point: {x: number; y: number}) => ({x: point.x - 10, y: point.y}),
  }
  vi.stubGlobal(
    'Image',
    class {
      decoding = ''
      src = ''
      decode = vi.fn().mockResolvedValue(undefined)
    },
  )
  for (const [mock, value] of [
    [mocks.Application, application],
    [mocks.Container, root],
  ] as const) {
    mock.mockImplementation(
      class {
        constructor() {
          Object.assign(this, value)
        }
      } as unknown as () => unknown,
    )
  }
  mocks.MeshSimple.mockImplementation(
    class {
      alpha = 1
      vertices: Float32Array
      visible = true

      constructor(options: {readonly vertices: Float32Array}) {
        this.vertices = options.vertices
      }
    } as unknown as () => unknown,
  )
  mocks.TextureFrom.mockReturnValue({destroy: vi.fn()})
  return {
    alphas: () =>
      mocks.MeshSimple.mock.results.map((result) => (result.value as {alpha: number}).alpha),
    tick: (seconds: number) => {
      for (const [callback] of application.ticker.add.mock.calls) {
        ;(callback as (ticker: {deltaMS: number}) => void)({deltaMS: seconds * 1000})
      }
    },
  }
}

const prepare = (document: PuppetDocument) => {
  const result = parseDocument(serializeDocument(document))
  if (!result.ok) {
    throw new Error('Expected the test document to be valid')
  }
  return result.document
}

test('should fade expressions and pose entries and hit-test areas', async () => {
  const renderer = setUpRenderer()
  const player = await createPlayer({
    canvas: globalThis.document.createElement('canvas'),
    document: prepare(presetDocument),
  })

  expect(renderer.alphas()).toEqual([1, 0, 1])
  expect(player.setExpression('missing')).toBe(false)
  expect(player.setExpression('open')).toBe(true)
  expect(player.getExpression()).toBe('open')
  expect(player.getParameterValue('mouth')).toBe(0)
  renderer.tick(0.25)
  expect(player.getParameterValue('mouth')).toBe(0.5)
  renderer.tick(0.25)
  expect(player.getParameterValue('mouth')).toBe(1)

  player.setParameterValue('pose', 1)
  renderer.tick(0.25)
  expect(renderer.alphas()).toEqual([0.5, 0.5, 1])
  renderer.tick(0.25)
  expect(renderer.alphas()).toEqual([0, 1, 1])

  expect(player.hitTest({x: 55, y: 5})).toBe('body')
  expect(player.hitTest({x: 15, y: 5})).toBeUndefined()

  player.destroy()
})
