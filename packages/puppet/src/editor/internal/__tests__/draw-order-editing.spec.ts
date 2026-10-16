import {describe, expect, test} from 'vitest'

import {getPartRenderProperties} from '../../../deformation'
import {
  parseDocumentValue,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player'
import {setDrawOrderGroup} from '../group-properties'
import {insertParameterKeyform} from '../parameter-keyforms'
import {createParameterPreview} from '../parameter-sampling'
import {setParameterKeyformPartProperties} from '../part-properties'

const vertices = [0, 0, 1, 0, 0, 1]

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 'swing',
      keyforms: [
        {
          groups: [{groupId: 'g', properties: {drawOrder: 200}}],
          parts: [{partId: 'arm', properties: {drawOrder: 300}, vertices}],
          values: [0],
        },
        {
          groups: [{groupId: 'g', properties: {drawOrder: 800}}],
          parts: [{partId: 'arm', properties: {drawOrder: 700}, vertices}],
          values: [1],
        },
      ],
      parameterIds: ['swing'],
      targetGroupIds: ['g'],
      targetPartIds: ['arm'],
    },
  ],
  parameters: [{defaultValue: 0, id: 'swing', maximum: 1, minimum: 0, name: 'Swing'}],
  parts: [
    {
      id: 'arm',
      mesh: {indices: [0, 1, 2], uvs: vertices, vertices},
      texture: {height: 1, src: 'arm.png', width: 1},
    },
  ],
  scene: {
    roots: [
      {
        children: [{id: 'arm', kind: 'part', locked: false, name: 'Arm', visible: true}],
        id: 'g',
        kind: 'group',
        locked: false,
        name: 'G',
        properties: {drawOrder: 500},
        visible: true,
      },
    ],
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const armKeyform = (document: PuppetDocument | undefined, value: number) =>
  document?.parameterBindings?.[0]?.keyforms.find((keyform) => keyform.values[0] === value)

describe('draw order editing', () => {
  test('should show the composed draw order and edit a keyform by its offset', () => {
    const document = createDocument()
    expect(parseDocumentValue(document).ok).toBe(true)
    const preview = createParameterPreview({document, parameterValues: {swing: 0.5}})
    expect(preview.parts[0]?.properties?.drawOrder).toBe(500)
    const edited = setParameterKeyformPartProperties({
      bindingId: 'swing',
      currentProperties: {...getPartRenderProperties(preview.parts[0]!), drawOrder: 300},
      document,
      partId: 'arm',
      properties: {drawOrder: 350},
      values: [0],
    })
    expect(armKeyform(edited, 0)?.parts[0]?.properties?.drawOrder).toBe(350)
  })

  test('should keep draw orders when inserting a keyform between two', () => {
    const inserted = insertParameterKeyform({
      bindingId: 'swing',
      document: createDocument(),
      values: [0.25],
    })
    const keyform = armKeyform(inserted, 0.25)
    expect(keyform?.parts[0]?.properties?.drawOrder).toBeCloseTo(400)
    expect(keyform?.groups?.[0]?.properties.drawOrder).toBeCloseTo(350)
    expect(parseDocumentValue(inserted!).ok).toBe(true)
  })

  test('should drop keyed draw orders when the group stops being a draw order group', () => {
    const plain = setDrawOrderGroup(createDocument(), 'g', false)!
    expect(armKeyform(plain, 0)?.groups?.[0]?.properties.drawOrder).toBeUndefined()
    expect(parseDocumentValue(plain).ok).toBe(true)
    const grouped = setDrawOrderGroup(plain, 'g', true)!
    expect(grouped.scene?.roots[0]).toMatchObject({properties: {drawOrder: 500}})
  })
})
