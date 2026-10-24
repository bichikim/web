import {describe, expect, test} from 'vitest'

import {composeParameterScene} from '../../../deformation'
import {applySceneNodeDeformers} from '../../../deformation/vertices'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetParameterDeformerKeyform,
  type PuppetSceneDeformerNode,
} from '../../document'
import {parseDocumentValue} from '../../parse-document'
import {getPartRenderPlans} from '../render-plan'

const vertices = [10, 0, 20, 0, 10, 10]

const deformer = (overrides: Partial<PuppetSceneDeformerNode> = {}): PuppetSceneDeformerNode => ({
  boneRestPoints: [0, 0, 10, 0],
  bounds: {height: 20, width: 20, x: -10, y: -10},
  children: [{id: 'arm', kind: 'part', locked: false, name: 'Arm', visible: true}],
  columns: 1,
  controlPoints: [0, 0, 10, 0],
  deformerType: 'rotation',
  id: 'rot',
  kind: 'deformer',
  locked: false,
  name: 'Rot',
  rows: 1,
  visible: true,
  ...overrides,
})

const entry = (
  overrides: Partial<PuppetParameterDeformerKeyform> = {},
): PuppetParameterDeformerKeyform => ({
  controlPoints: [0, 0, 10, 0],
  kind: 'deformer',
  nodeId: 'rot',
  ...overrides,
})

const createDocument = (
  keyforms: readonly [PuppetParameterDeformerKeyform, PuppetParameterDeformerKeyform],
  node: PuppetSceneDeformerNode = deformer(),
): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 's',
      keyforms: keyforms.map((keyform, index) => ({
        deformers: [keyform],
        parts: [],
        values: [index],
      })),
      parameterIds: ['s'],
      targetDeformerIds: ['rot'],
      targetPartIds: [],
    },
  ],
  parameters: [{defaultValue: 0, id: 's', maximum: 1, minimum: 0, name: 'S'}],
  parts: [
    {
      id: 'arm',
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices},
      texture: {height: 1, src: 'arm.png', width: 1},
    },
  ],
  scene: {roots: [node]},
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const pose = (document: PuppetDocument, s: number) => {
  // Deformers write into the arrays they are given.
  const posed = new Map([['arm', [...vertices]]])
  applySceneNodeDeformers(composeParameterScene(document, {s}).roots, posed)
  return posed.get('arm') ?? []
}

const expectPoints = (actual: ReadonlyArray<number>, expected: ReadonlyArray<number>) =>
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 9))

describe('deformer properties', () => {
  test('should retain the lower rotation keyform reflection until reaching the next SDK key', () => {
    const document = createDocument([
      entry(),
      entry({controlPoints: [0, 0, 0, 10], rotationReflection: [true, false]}),
    ])
    expect(parseDocumentValue(document).ok).toBe(true)
    expectPoints(pose(document, 0), vertices)
    expectPoints(pose(document, 1), [0, -10, 0, -20, -10, -10])
    const c = Math.SQRT1_2
    expectPoints(pose(document, 0.5), [10 * c, 10 * c, 20 * c, 20 * c, 0, 20 * c])
    const vertical = createDocument([entry({rotationReflection: [false, true]}), entry()])
    expectPoints(pose(vertical, 0.99), [10, 0, 20, 0, 10, -10])
    expectPoints(pose(vertical, 1), vertices)
  })

  test('should reject reflection on non-rotation deformers and malformed axis flags', () => {
    const reflected = entry({rotationReflection: [true, false]})
    expect(
      parseDocumentValue(createDocument([entry(), reflected], deformer({deformerType: undefined})))
        .ok,
    ).toBe(false)
    const document = createDocument([entry(), reflected])
    expect(
      parseDocumentValue({
        ...document,
        parameterBindings: document.parameterBindings!.map((binding) => ({
          ...binding,
          keyforms: binding.keyforms.map((keyform) => ({
            ...keyform,
            deformers: [{...reflected, rotationReflection: [1, false]}],
          })),
        })),
      }).ok,
    ).toBe(false)
  })

  test('should scale a rotation deformer’s content about its pivot as the keyed scale changes', () => {
    const document = createDocument([
      entry(),
      entry({controlPoints: [0, 0, 0, 10], rotationScale: 2}),
    ])
    expect(parseDocumentValue(document).ok).toBe(true)
    expectPoints(pose(document, 0), vertices)
    // A quarter turn, doubled.
    expectPoints(pose(document, 1), [0, 20, 0, 40, -20, 20])
    const scaleOnly = createDocument([entry(), entry({rotationScale: 3})])
    expectPoints(pose(scaleOnly, 0.5), [20, 0, 40, 0, 20, 20])
    const staticScale = createDocument(
      [entry(), entry()],
      deformer({rotationReflection: [true, false], rotationScale: 2}),
    )
    expect(parseDocumentValue(staticScale).ok).toBe(true)
    expectPoints(pose(staticScale, 0.5), [-20, 0, -40, 0, -20, 20])
  })

  test('should pass a deformer’s keyed opacity and colors to the parts inside it', () => {
    const document = createDocument(
      [
        entry(),
        entry({properties: {multiplyColor: [0.5, 1, 1], opacity: 0.2, screenColor: [0, 0, 0.4]}}),
      ],
      deformer({properties: {opacity: 0.8}}),
    )
    expect(parseDocumentValue(document).ok).toBe(true)
    const [rest] = getPartRenderPlans(document, {s: 0})
    expect(rest?.properties.opacity).toBeCloseTo(0.8)
    const [half] = getPartRenderPlans(document, {s: 0.5})
    expect(half?.properties.opacity).toBeCloseTo(0.5)
    expect(half?.properties.multiplyColor[0]).toBeCloseTo(0.75)
    expect(half?.properties.screenColor[2]).toBeCloseTo(0.2)
  })

  test('should validate deformer properties and rotation scales', () => {
    const valid = (
      keyform: PuppetParameterDeformerKeyform,
      node: PuppetSceneDeformerNode = deformer(),
    ) => parseDocumentValue(createDocument([entry(), keyform], node)).ok
    expect(valid(entry({rotationScale: 0}))).toBe(true)
    expect(valid(entry({rotationScale: -1}))).toBe(false)
    expect(valid(entry(), deformer({deformerType: undefined}))).toBe(true)
    expect(valid(entry({rotationScale: 2}), deformer({deformerType: undefined}))).toBe(false)
    expect(valid(entry(), deformer({rotationScale: 2}))).toBe(true)
    expect(valid(entry({properties: {opacity: 2}}))).toBe(false)
    const drawOrder = {drawOrder: 300} as PuppetSceneDeformerNode['properties']
    expect(valid(entry(), deformer({properties: drawOrder}))).toBe(false)
  })
})
