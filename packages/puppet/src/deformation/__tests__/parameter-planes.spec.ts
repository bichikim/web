import {isThreeDimensionalParameterBinding} from '../parameter'
import {describe, expect, test} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetParameter,
  type PuppetParameterKeyform3D,
} from '../../player/document'
import {parseDocumentValue} from '../../player/parse-document'
import {composeParameterVertices} from '../composition'

const REST = [0, 0, 1, 0, 0, 1]
const POINTS = [
  [0, 0],
  [1, 0],
  [0, 1],
] as const

const parameter = (id: string, overrides: Partial<PuppetParameter> = {}): PuppetParameter => ({
  defaultValue: 0,
  id,
  maximum: 1,
  minimum: -1,
  name: id,
  ...overrides,
})

/** A keyform whose first vertex sits at `10·x + 100·z`, linear in every parameter. */
const keyform = (x: number, y: number, z: number): PuppetParameterKeyform3D => ({
  parts: [{partId: 'dot', vertices: [10 * x + 100 * z, 0, 1, 0, 0, 1]}],
  values: [x, y, z],
})

const createDocument = (
  planes: ReadonlyArray<number>,
  depth: PuppetParameter = parameter('z'),
): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 'xyz',
      keyforms: planes.flatMap((z) => POINTS.map(([x, y]) => keyform(x, y, z))),
      parameterIds: ['x', 'y', depth.id],
      targetPartIds: ['dot'],
    },
  ],
  parameters: [parameter('x'), parameter('y'), depth],
  parts: [
    {
      id: 'dot',
      mesh: {indices: [0, 1, 2], uvs: REST, vertices: REST},
      texture: {height: 1, src: 'dot.png', width: 1},
    },
  ],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const firstX = (document: PuppetDocument, values: Readonly<Record<string, number>>) =>
  composeParameterVertices({
    document,
    parameterValues: values,
    partId: 'dot',
    restVertices: REST,
  })[0]

describe('three-parameter keyforms', () => {
  test('should sample each plane like a 2D binding and blend between planes', () => {
    const document = createDocument([-1, 1])
    expect(firstX(document, {x: 0.25, y: 0.25, z: -1})).toBeCloseTo(-97.5)
    expect(firstX(document, {x: 0.25, y: 0.25, z: 0})).toBeCloseTo(2.5)
    expect(firstX(document, {x: 0.5, y: 0.25, z: 0.5})).toBeCloseTo(55)
    // Past the last plane holds it, like a 1D binding.
    expect(firstX(createDocument([-1, 0]), {x: 0, y: 0, z: 1})).toBeCloseTo(0)
  })

  test('should wrap from the last plane into the first when the third parameter repeats', () => {
    const depth = parameter('z', {maximum: 1, minimum: 0, repeat: true})
    const document = createDocument([0, 0.5], depth)
    // 0.75 is halfway from the plane at 0.5 to the plane at 0 placed at 1.
    expect(firstX(document, {x: 0, y: 0, z: 0.75})).toBeCloseTo(25)
  })

  test('should accept different XY keys in each plane and reject a fourth axis', () => {
    const document = createDocument([-1, 1])
    expect(parseDocumentValue(document).ok).toBe(true)
    const [binding] = document.parameterBindings!
    const missing = {...binding!, keyforms: binding!.keyforms.slice(1)}
    expect(parseDocumentValue({...document, parameterBindings: [missing]}).ok).toBe(true)
    const fourAxes = {...binding!, parameterIds: ['x', 'y', 'z', 'w']}
    expect(parseDocumentValue({...document, parameterBindings: [fourAxes]}).ok).toBe(false)
  })
})

test('should sample sparse planes independently before blending in Z', () => {
  const document = createDocument([-1, 1])
  const binding = document.parameterBindings![0]!
  if (!isThreeDimensionalParameterBinding(binding)) {
    throw new Error('3차원 바인딩이 필요합니다.')
  }
  const sparse = {
    ...document,
    parameterBindings: [
      {
        ...binding,
        keyforms: binding.keyforms.filter((key) => key.values[2] === -1 || key.values[0] === 0),
      },
    ],
  }
  expect(parseDocumentValue(sparse).ok).toBe(true)
  expect(firstX(sparse, {x: 0.5, y: 0, z: -1})).toBeCloseTo(-95)
  expect(firstX(sparse, {x: 0.5, y: 0, z: 1})).toBeCloseTo(100)
  expect(firstX(sparse, {x: 0.5, y: 0, z: 0})).toBeCloseTo(2.5)
})
