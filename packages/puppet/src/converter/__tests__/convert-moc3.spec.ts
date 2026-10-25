import {expect, test, vi} from 'vitest'
import {convertMoc3} from '../convert-moc3'
import {type Moc3Model, type Moc3Table, readMoc3} from '../read-moc3'
import {parseDocumentValue} from '../../player/parse-document'
import {getPartRenderPlans} from '../../player/internal/render-plan'
import {composeParameterVertices} from '../../deformation/composition'

vi.mock('../read-moc3', () => ({readMoc3: vi.fn()}))

const table = (columns: Moc3Table['columns'], ids: ReadonlyArray<string> = []): Moc3Table => ({
  columns,
  ids,
})
const fixture = (): Moc3Model => ({
  canvas: {height: 100, originX: 50, originY: 50, pixelsPerUnit: 100, reverseY: false, width: 100},
  counts: {artMeshes: 1, deformers: 0, glue: 0, orderGroups: 1, parts: 0},
  tables: {
    artMeshes: table(
      {
        begin: [0],
        binding: [0],
        count: [2],
        enabled: [1],
        flags: [4],
        indexBegin: [0],
        indexCount: [3],
        maskBegin: [0],
        maskCount: [0],
        parentDeformer: [-1],
        parentPart: [-1],
        texture: [0],
        uvBegin: [0],
        vertices: [3],
        visible: [1],
      },
      ['mesh'],
    ),
    bindingIndices: table({values: [0]}),
    deformers: table({}),
    glue: table({}),
    indices: table({values: [0, 1, 2]}),
    keyformBindings: table({begin: [0], count: [1]}),
    keys: table({values: [-1, 1]}),
    masks: table({values: []}),
    meshKeyforms: table({opacity: [0.5, 1], order: [10, 20], positionBegin: [0, 6]}),
    orderGroups: table({begin: [0], count: [1]}),
    orderObjects: table({index: [0], self: [-1], type: [0]}),
    parameterBindings: table({begin: [0], count: [2]}),
    parameters: table(
      {
        bindingBegin: [0],
        bindingCount: [1],
        default: [0],
        maximum: [1],
        minimum: [-1],
        repeat: [0],
      },
      ['p'],
    ),
    parts: table({}),
    positions: table({values: [0, 0, 1, 0, 0, 1, 1, 0, 2, 0, 1, 1]}),
    uvs: table({values: [0, 0, 1, 0, 0, 1]}),
  },
  version: 3,
})

const texture = {
  height: 1,
  src:
    'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',
  width: 1,
}

test('should preserve compiled parameter grids and interpolate the default mesh and opacity', () => {
  vi.mocked(readMoc3).mockReturnValue(fixture())
  const {document} = convertMoc3(new Uint8Array(), {textures: [texture]})
  expect(document.parameters).toEqual([
    {defaultValue: 0, id: 'p', maximum: 1, minimum: -1, name: 'p', repeat: false},
  ])
  expect(document.parts[0]?.mesh.vertices).toEqual([0.5, 0, 1.5, 0, 0.5, 1])
  expect(document.parts[0]?.properties?.opacity).toBe(0.75)
  expect(document.parameterBindings?.[0]?.keyforms.map((form) => form.values)).toEqual([[-1], [1]])
  expect(document.scene?.roots[0]).toMatchObject({
    controlPoints: [50, 50, 150, 50, 50, 150, 150, 150],
    coordinateSpace: 'parent',
  })
})

test('should normalize the compiled reversed Y coordinate convention', () => {
  const model = fixture()
  vi.mocked(readMoc3).mockReturnValue({...model, canvas: {...model.canvas, reverseY: true}})
  const {document} = convertMoc3(new Uint8Array(), {textures: [texture]})
  expect(document.parts[0]?.mesh.vertices).toEqual([0.5, 0, 1.5, 0, 0.5, -1])
  expect(document.parts[0]?.mesh.uvs).toEqual([0, 1, 1, 1, 0, 0])
  expect(document.parts[0]?.mesh.indices).toEqual([2, 1, 0])
  expect(document.scene?.roots[0]).toMatchObject({
    controlPoints: [50, 50, 150, 50, 50, 150, 150, 150],
  })
})

test.each([0, 1, 2])('should preserve a compiled placeholder with %i vertices', (vertices) => {
  const model = fixture()
  vi.mocked(readMoc3).mockReturnValue({
    ...model,
    tables: {
      ...model.tables,
      artMeshes: table(
        {...model.tables.artMeshes!.columns, indexCount: [0], vertices: [vertices]},
        ['mesh'],
      ),
    },
  })
  const {document} = convertMoc3(new Uint8Array(), {textures: [texture]})
  expect(document.parts).toHaveLength(1)
  expect(document.parts[0]?.mesh).toMatchObject({
    indices: [],
    validationSpace: 'indices',
    vertices: Array.from({length: vertices}, (_, index) => [index + 0.5, 0]).flat(),
  })
  expect(parseDocumentValue(document)).toMatchObject({ok: true})
})

test('should require every referenced external texture instead of discarding meshes', () => {
  vi.mocked(readMoc3).mockReturnValue(fixture())
  expect(() => convertMoc3(new Uint8Array(), {textures: []})).toThrow('인덱스 0')
})

test('should list all missing texture indices before converting any meshes', () => {
  const model = fixture()
  vi.mocked(readMoc3).mockReturnValue({
    ...model,
    tables: {
      ...model.tables,
      artMeshes: table({...model.tables.artMeshes!.columns, texture: [1, 3]}, ['first', 'second']),
    },
  })
  expect(() => convertMoc3(new Uint8Array(), {textures: [texture]})).toThrow('인덱스 1, 3')
})

test('should reject incomplete keyform grids', () => {
  const model = fixture()
  vi.mocked(readMoc3).mockReturnValue({
    ...model,
    tables: {
      ...model.tables,
      artMeshes: table({...model.tables.artMeshes!.columns, count: [1]}, ['mesh']),
    },
  })
  expect(() => convertMoc3(new Uint8Array(), {textures: [texture]})).toThrow(/keyform|grid/i)
})

test('should add compiled blend shape deltas to the ordinary parameter grid', () => {
  const model = fixture()
  const tables = model.tables
  vi.mocked(readMoc3).mockReturnValue({
    ...model,
    tables: {
      ...tables,
      blendBindings: table({base: [0], begin: [2], count: [2]}),
      blendKeyforms: table({
        begin: [2],
        binding: [0],
        constraintBegin: [0],
        constraintCount: [0],
        count: [2],
      }),
      blendMeshes: table({begin: [0], count: [1], target: [0]}),
      keys: table({values: [-1, 1, 0, 1]}),
      meshKeyforms: table({
        multiplyBegin: [0, 1, 2, 3],
        opacity: [0.5, 1, 0, 0.5],
        order: [10, 20, 0, 0],
        positionBegin: [0, 6, 12, 18],
        screenBegin: [0, 0, 0, 0],
      }),
      multiplyColors: table({blue: [0, 1, 0, 0.8], green: [0, 1, 0, 0.8], red: [0, 1, 0, 0.8]}),
      parameters: table(
        {
          bindingBegin: [0, 1],
          bindingCount: [1, 0],
          blendBegin: [0, 0],
          blendCount: [0, 1],
          default: [0, 0],
          maximum: [1, 1],
          minimum: [-1, 0],
          repeat: [0, 0],
        },
        ['p', 'q'],
      ),
      positions: table({
        values: [...tables.positions!.columns.values!, 0, 0, 0, 0, 0, 0, 0.25, 0, 0.25, 0, 0.25, 0],
      }),
      screenColors: table({blue: [0], green: [0], red: [0]}),
    },
    version: 5,
  })
  const {document} = convertMoc3(new Uint8Array(), {textures: [texture]})
  expect(
    composeParameterVertices({
      document,
      parameterValues: {p: 0, q: 1},
      partId: 'mesh',
      restVertices: document.parts[0]!.mesh.vertices,
    }),
  ).toEqual([0.75, 0, 1.75, 0, 0.75, 1])
  const properties = getPartRenderPlans(document, {p: -1, q: 1})[0]!.properties
  expect(properties.opacity).toBe(1)
  expect(properties.multiplyColor).toEqual([0.8, 0.8, 0.8])
  expect(
    parseDocumentValue({
      ...document,
      parameterBindings: document.parameterBindings!.map((binding) => ({
        ...binding,
        keyformRange: undefined,
      })),
    }).ok,
  ).toBe(false)

  expect(
    composeParameterVertices({
      document,
      parameterValues: {p: 0, q: 0.0005},
      partId: 'mesh',
      restVertices: document.parts[0]!.mesh.vertices,
    })[0],
  ).toBeCloseTo(0.500125, 8)
})

test('should hide a compiled object outside its keyform range including float32 tolerance', () => {
  const model = fixture()
  vi.mocked(readMoc3).mockReturnValue({
    ...model,
    tables: {
      ...model.tables,
      parameters: table({...model.tables.parameters!.columns, minimum: [-2]}, ['p']),
    },
  })
  const {document} = convertMoc3(new Uint8Array(), {textures: [texture]})
  expect(getPartRenderPlans(document, {p: -1.001})[0]?.visible).toBe(true)
  expect(getPartRenderPlans(document, {p: -1.002})[0]?.visible).toBe(false)
  expect(getPartRenderPlans(document, {p: 1})[0]?.visible).toBe(true)
})

test('should leave both zero-weight Glue endpoints unchanged', () => {
  const model = fixture()
  vi.mocked(readMoc3).mockReturnValue({
    ...model,
    tables: {
      ...model.tables,
      artMeshes: table(
        Object.fromEntries(
          Object.entries(model.tables.artMeshes!.columns).map(([name, values]) => [
            name,
            [...values, ...values],
          ]),
        ),
        ['mesh', 'mesh2'],
      ),
      glue: table(
        {
          begin: [0],
          binding: [1],
          count: [1],
          infoBegin: [0],
          infoCount: [2],
          meshA: [0],
          meshB: [1],
        },
        ['seam'],
      ),
      glueInfo: table({vertex: [0, 1], weight: [0, 0]}),
      glueKeyforms: table({intensity: [1]}),
      keyformBindings: table({begin: [0, 1], count: [1, 0]}),
    },
  })
  const {document} = convertMoc3(new Uint8Array(), {textures: [texture]})
  expect(document.glue).toEqual([
    {
      first: {partId: 'mesh', vertexIndex: 0},
      id: 'seam:0',
      second: {partId: 'mesh2', vertexIndex: 1},
      strength: 0,
      weight: 0,
    },
  ])
})

test.each([
  ['parentPart', 0],
  ['parentPart', -2],
  ['parentDeformer', -2],
] as const)('should reject a mesh with an invalid %s reference %i', (field, parent) => {
  const model = fixture()
  vi.mocked(readMoc3).mockReturnValue({
    ...model,
    tables: {
      ...model.tables,
      artMeshes: table({...model.tables.artMeshes!.columns, [field]: [parent]}, ['mesh']),
    },
  })
  expect(() => convertMoc3(new Uint8Array(), {textures: [texture]})).toThrow(/parent|hierarchy/i)
})

test.each([4, 5])(
  'should convert a compiled %s-axis grid without truncating default coordinates',
  (dimensions) => {
    const model = fixture()
    const axes = Array.from({length: dimensions}, (_, index) => index)
    const forms = Array.from({length: 2 ** dimensions}, (_, index) => index)
    const tables = {
      ...model.tables,
      artMeshes: table({...model.tables.artMeshes!.columns, count: [forms.length]}, ['mesh']),
      bindingIndices: table({values: axes}),
      keyformBindings: table({begin: [0], count: [dimensions]}),
      keys: table({values: axes.flatMap(() => [0, 1])}),
      meshKeyforms: table({
        opacity: forms.map(() => 1),
        order: forms.map(() => 10),
        positionBegin: forms.map((index) => index * 6),
      }),
      parameterBindings: table({begin: axes.map((index) => index * 2), count: axes.map(() => 2)}),
      parameters: table(
        {
          bindingBegin: axes,
          bindingCount: axes.map(() => 1),
          default: axes.map(() => 0.5),
          maximum: axes.map(() => 1),
          minimum: axes.map(() => 0),
          repeat: axes.map(() => 0),
        },
        axes.map((index) => `p${index}`),
      ),
      positions: table({values: forms.flatMap((index) => [index, 0, index + 1, 0, index, 1])}),
    }
    vi.mocked(readMoc3).mockReturnValue({...model, tables})
    const {document} = convertMoc3(new Uint8Array(), {textures: [texture]})
    expect(document.parts[0]!.mesh.vertices[0]).toBeCloseTo((forms.length - 1) / 2)
    const posed = composeParameterVertices({
      document,
      parameterValues: Object.fromEntries(axes.map((index) => [`p${index}`, 1])),
      partId: 'mesh',
      restVertices: document.parts[0]!.mesh.vertices,
    })
    expect(posed[0]).toBeCloseTo(forms.length - 1)
    expect(parseDocumentValue(document).ok).toBe(true)
  },
)
