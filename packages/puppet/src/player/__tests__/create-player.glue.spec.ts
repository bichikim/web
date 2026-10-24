/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createPlayer} from '../create-player'
import {createDemoDocument} from '../create-demo-document'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'
import {addGlue, setGlueKeyform} from '../../editor/internal/glue'

const meshes = vi.hoisted(() => [] as Array<{vertices: Float32Array}>)
vi.mock('pixi.js', () => ({
  Application: class {
    stage = {addChild: vi.fn()}
    screen = {height: 640, width: 960}
    ticker = {add: vi.fn()}
    init = vi.fn()
    render = vi.fn()
    start = vi.fn()
    stop = vi.fn()
    destroy = vi.fn()
  },
  Container: class {
    position = {set: vi.fn()}
    scale = {set: vi.fn()}
    addChild = vi.fn()
  },
  MeshSimple: class {
    vertices: Float32Array
    geometry: {positions: Float32Array; indices: Uint32Array; uvs: Float32Array}
    constructor(options: {vertices: Float32Array; indices: Uint32Array; uvs: Float32Array}) {
      this.vertices = options.vertices
      this.geometry = {indices: options.indices, positions: options.vertices, uvs: options.uvs}
      meshes.push(this)
    }
  },
  Texture: {from: () => ({destroy: vi.fn()})},
}))
afterEach(() => {
  meshes.length = 0
  vi.unstubAllGlobals()
})

test('should apply keyed Glue after parameter deformation and restore it after seek', async () => {
  vi.stubGlobal(
    'Image',
    class {
      src = ''
      decode = vi.fn().mockResolvedValue(undefined)
    },
  )
  const source = createDemoDocument()
  const joined = addGlue(
    {...source, parts: source.parts.map((part) => ({...part, properties: undefined}))},
    {partId: 'mesh-preview', vertexIndex: 0},
    {partId: 'shape-diamond', vertexIndex: 0},
  )!
  const document = setGlueKeyform({
    bindingId: joined.parameterBindings![0]!.id,
    changes: {strength: 0, weight: 0.5},
    document: joined,
    glueId: 'glue-1',
    values: [0, 0],
  })!
  const parsed = parseDocument(serializeDocument(document))
  if (!parsed.ok) {
    throw new Error('Expected valid Glue model')
  }
  const player = await createPlayer({
    canvas: globalThis.document.createElement('canvas'),
    document: parsed.document,
  })
  const first = meshes[0]!
  const second = meshes[2]!
  expect(Array.from(first.vertices.slice(0, 2))).toEqual(
    document.parts[0]!.mesh.vertices.slice(0, 2),
  )
  player.setParameterValues({'angle-x': 30, 'angle-y': 0})
  expect(Array.from(first.vertices.slice(0, 2))).toEqual(Array.from(second.vertices.slice(0, 2)))
  player.setParameterValues({'angle-x': 0, 'angle-y': 0})
  player.seek(0)
  expect(Array.from(first.vertices.slice(0, 2))).toEqual(
    document.parts[0]!.mesh.vertices.slice(0, 2),
  )
  player.destroy()
})
