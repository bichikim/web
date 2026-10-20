import {describe, expect, test} from 'vitest'

import {
  parseDocumentValue,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player'
import {setDeformerRenderProperties, setDeformerRotationScale} from '../deformer-render-properties'
import {insertParameterKeyform} from '../parameter-keyforms'

const createDocument = (deformerType?: 'rotation'): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 's',
      keyforms: [0, 1].map((value) => ({
        deformers: [{controlPoints: [0, 0, 10, 0], kind: 'deformer', nodeId: 'rot'}],
        parts: [],
        values: [value],
      })),
      parameterIds: ['s'],
      targetDeformerIds: ['rot'],
      targetPartIds: [],
    },
  ],
  parameters: [{defaultValue: 0, id: 's', maximum: 1, minimum: 0, name: 'S'}],
  parts: [],
  scene: {
    roots: [
      {
        boneRestPoints: [0, 0, 10, 0],
        bounds: {height: 20, width: 20, x: -10, y: -10},
        children: [],
        columns: 1,
        controlPoints: [0, 0, 10, 0],
        deformerType,
        id: 'rot',
        kind: 'deformer',
        locked: false,
        name: 'Rot',
        rows: 1,
        visible: true,
      },
    ],
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const deformerEntry = (document: PuppetDocument | undefined, value: number) =>
  document?.parameterBindings?.[0]?.keyforms.find((keyform) => keyform.values[0] === value)
    ?.deformers?.[0]

describe('deformer render properties editing', () => {
  test('should key opacity and colors in the selected keyform, else set the rest values', () => {
    const document = createDocument('rotation')
    const keyed = setDeformerRenderProperties({
      document,
      nodeId: 'rot',
      properties: {opacity: 0.4},
      target: {bindingId: 's', values: [1]},
    })
    expect(deformerEntry(keyed, 1)?.properties).toEqual({opacity: 0.4})
    expect(deformerEntry(keyed, 0)?.properties).toBeUndefined()
    const rest = setDeformerRenderProperties({
      document,
      nodeId: 'rot',
      properties: {screenColor: [0, 0, 1]},
    })
    expect(rest?.scene?.roots[0]).toMatchObject({properties: {screenColor: [0, 0, 1]}})
    expect(parseDocumentValue(rest!).ok).toBe(true)
  })

  test('should key a rotation scale only in a keyform of a rotation deformer', () => {
    const target = {bindingId: 's', values: [1] as const}
    const scaled = setDeformerRotationScale({
      document: createDocument('rotation'),
      nodeId: 'rot',
      rotationScale: 2,
      target,
    })
    expect(deformerEntry(scaled, 1)?.rotationScale).toBe(2)
    expect(parseDocumentValue(scaled!).ok).toBe(true)
    const grid = createDocument()
    expect(
      setDeformerRotationScale({document: grid, nodeId: 'rot', rotationScale: 2, target}),
    ).toBe(undefined)
  })

  test('should sample keyed properties and scale into an inserted keyform', () => {
    const keyed = setDeformerRenderProperties({
      document: createDocument('rotation'),
      nodeId: 'rot',
      properties: {opacity: 0},
      target: {bindingId: 's', values: [1]},
    })!
    const scaled = setDeformerRotationScale({
      document: keyed,
      nodeId: 'rot',
      rotationScale: 3,
      target: {bindingId: 's', values: [1]},
    })!
    const inserted = insertParameterKeyform({bindingId: 's', document: scaled, values: [0.5]})
    const entry = deformerEntry(inserted, 0.5)
    expect(entry?.properties?.opacity).toBeCloseTo(0.5)
    expect(entry?.rotationScale).toBeCloseTo(2)
    expect(parseDocumentValue(inserted!).ok).toBe(true)
  })
})
