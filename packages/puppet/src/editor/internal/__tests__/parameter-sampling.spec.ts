import {createKeyedParameter} from './parameter-keyforms/fixtures'
import {describe, expect, test} from 'vitest'

import {
  createDemoDocument,
  createEmptyDocument,
  parseDocumentValue,
  type PuppetDocument,
  type PuppetParameterBinding1D,
} from '../../../player'
import {getPartRenderFrame, getPartRenderPlans} from '../../../player/internal/render-plan'
import {
  insertParameterKeyform,
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerCurveHandle,
  setParameterKeyformDeformerPoint,
} from '../parameter-keyforms'
import {
  createParameterPreview,
  getParameterEditingDocument,
  sampleParameterVertices,
  samplePartKeyform,
} from '../parameter-sampling'
import {
  getDeformerAngle,
  getDeformerRotationOrigin,
  rotateDeformerControlPoints,
} from '../deformer-transform'
import {addDeformerCurveHandle} from '../deformer-curve-handles'
import {createDeformer, getSceneNode} from '../scene-graph'

describe('sampleParameterVertices', () => {
  test('should interpolate the whole vertex shape between adjacent keyforms', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const binding = document.parameterBindings?.[0]

    expect(
      sampleParameterVertices({
        binding,
        partId: part.id,
        restVertices: part.mesh.vertices,
        values: [15, 0],
      }).slice(-2),
    ).toEqual([352, 240])
    expect(part.mesh.vertices.slice(-2)).toEqual([320, 240])
  })
})

describe('samplePartKeyform', () => {
  test('should retain interpolated opacity and colors in an intermediate keyform', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const binding: PuppetParameterBinding1D = {
      id: 'appearance',
      keyforms: [
        {parts: [{partId: part.id, vertices: part.mesh.vertices}], values: [0]},
        {
          parts: [
            {
              partId: part.id,
              properties: {multiplyColor: [0, 1, 0], opacity: 0, screenColor: [1, 0, 1]},
              vertices: part.mesh.vertices,
            },
          ],
          values: [30],
        },
      ],
      parameterIds: ['angle-x'],
      targetPartIds: [part.id],
    }

    expect(samplePartKeyform({binding, document, part, values: [15]})).toMatchObject({
      partId: part.id,
      properties: {multiplyColor: [0.5, 1, 0.5], opacity: 0.5, screenColor: [0.5, 0, 0.5]},
      vertices: part.mesh.vertices,
    })
    expect(
      samplePartKeyform({
        binding: document.parameterBindings![0]!,
        document,
        part,
        values: [15, 0],
      }).properties,
    ).toBeUndefined()
  })
})

describe('createParameterPreview', () => {
  test.each([-30, 0, 30])('should retain conditional paint order in a sampled yaw of %s', (yaw) => {
    const source = createDemoDocument()
    const [first, second] = source.parts
    const document: PuppetDocument = {
      ...source,
      layerOrderRules: [
        {
          partIds: [first!.id],
          placement: 'after',
          referencePartId: second!.id,
          when: {comparison: 'greater-than', parameterIds: ['angle-x', 'angle-y'], threshold: 22},
        },
        {
          partIds: [first!.id],
          placement: 'after',
          referencePartId: second!.id,
          when: {comparison: 'less-than', parameterIds: ['angle-x', 'angle-y'], threshold: -22},
        },
      ],
    }
    const parameterValues = {'angle-x': yaw / 2, 'angle-y': yaw / 2}
    const preview = createParameterPreview({document, parameterValues})
    expect(getPartRenderPlans(preview).map((plan) => plan.partId)).toEqual(
      getPartRenderPlans(document, parameterValues).map((plan) => plan.partId),
    )
    expect(preview.parameterBindings).toEqual([])
    expect(preview.parts[0]!.mesh.vertices).toEqual(
      createParameterPreview({document: preview}).parts[0]!.mesh.vertices,
    )
  })

  test('should clamp outside values and retain unaffected parts', () => {
    const document = createDemoDocument()
    const parameterId = document.parameters?.[0]?.id
    const preview = createParameterPreview({
      document,
      parameterValues: parameterId === undefined ? undefined : {[parameterId]: -100},
    })

    expect(preview.parts[0]?.mesh.vertices.slice(-2)).toEqual([256, 240])
    expect(preview.parts[1]?.mesh.vertices).toBe(document.parts[1]?.mesh.vertices)
    expect(preview.motions).toEqual([])
  })

  test('should interpolate whole-transform and point deformer keyforms', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformed = createDeformer(source, ['mesh-preview'])!
    const deformer = deformed.scene!.roots[0]!
    if (deformer.kind !== 'deformer') {
      throw new Error('Expected a deformer node.')
    }
    const added = createKeyedParameter({document: deformed, nodeIds: [deformer.id]})!
    const inserted = insertParameterKeyform({
      bindingId: added.binding.id,
      document: added.document,
      values: [30],
    })!
    const rotatedKeyform = setParameterKeyformDeformerControlPoints({
      bindingId: added.binding.id,
      controlPoints: rotateDeformerControlPoints({
        controlPoints: deformer.controlPoints,
        degrees: 60,
        origin: getDeformerRotationOrigin(deformer),
      }),
      document: inserted,
      nodeId: deformer.id,
      rotationOrigin: {
        x: getDeformerRotationOrigin(deformer).x + 60,
        y: getDeformerRotationOrigin(deformer).y + 30,
      },
      values: [30],
    })!
    const updated = setParameterKeyformDeformerPoint({
      bindingId: added.binding.id,
      document: rotatedKeyform,
      nodeId: deformer.id,
      pointIndex: 4,
      values: [30],
      x: 400,
      y: 300,
    })!
    const preview = createParameterPreview({
      document: updated,
      parameterValues: {[added.binding.parameterIds[0]]: 15},
    })
    const previewDeformer = getSceneNode(preview, deformer.id)

    expect(
      previewDeformer?.kind === 'deformer' ? getDeformerAngle(previewDeformer) : undefined,
    ).toBeCloseTo(30)
    expect(
      previewDeformer?.kind === 'deformer' ? previewDeformer.controlPoints.slice(8, 10) : [],
    ).toEqual([360, 270])
    expect(
      previewDeformer?.kind === 'deformer' ? previewDeformer.rotationOrigin : undefined,
    ).toEqual({x: 350, y: 255})
  })

  test('should interpolate optional curve handles between deformer keyforms', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformed = createDeformer(source, ['mesh-preview'])!
    const deformer = deformed.scene!.roots[0]!
    if (deformer.kind !== 'deformer') {
      throw new Error('Expected a deformer node.')
    }
    const withHandle = addDeformerCurveHandle(deformed, deformer.id, 0)!
    const restDeformer = getSceneNode(withHandle, deformer.id)
    if (restDeformer?.kind !== 'deformer' || restDeformer.curveHandles?.[0] === undefined) {
      throw new Error('Expected a curve handle.')
    }
    const restHandle = restDeformer.curveHandles[0]
    const added = createKeyedParameter({document: withHandle, nodeIds: [deformer.id]})!
    const inserted = insertParameterKeyform({
      bindingId: added.binding.id,
      document: added.document,
      values: [30],
    })!
    const edited = setParameterKeyformDeformerCurveHandle({
      axis: 'horizontal',
      bindingId: added.binding.id,
      document: inserted,
      nodeId: deformer.id,
      point: {x: restHandle.horizontal.x, y: restHandle.horizontal.y + 60},
      pointIndex: 0,
      values: [30],
    })!
    const preview = createParameterPreview({
      document: edited,
      parameterValues: {[added.binding.parameterIds[0]]: 15},
    })
    const previewDeformer = getSceneNode(preview, deformer.id)

    expect(
      previewDeformer?.kind === 'deformer'
        ? previewDeformer.curveHandles?.[0]?.horizontal.y
        : undefined,
    ).toBeCloseTo(restHandle.horizontal.y + 30)
  })
})

test('should apply influence to the editor preview and preserve source keyforms', () => {
  const source = createDemoDocument()
  const document = {
    ...source,
    parameterBindings: source.parameterBindings!.map((binding) => ({
      ...binding,
      influences: [
        {
          parameterId: 'angle-y',
          points: [
            {value: -30, weight: 1},
            {value: 30, weight: 0},
          ],
        },
      ],
    })),
  }
  const preview = createParameterPreview({document, parameterValues: {'angle-x': 15, 'angle-y': 0}})
  expect(preview.parts[0]!.mesh.vertices.slice(-2)).toEqual([336, 240])
  expect(document.parts[0]!.mesh.vertices.slice(-2)).toEqual([320, 240])
})

test('should show the original binding for editing without changing its runtime influence', () => {
  const source = createDemoDocument()
  for (const weight of [0, 0.5]) {
    const document = {
      ...source,
      parameterBindings: source.parameterBindings!.map((binding) => ({
        ...binding,
        influences: [{parameterId: 'angle-y', points: [{value: 0, weight}]}],
      })),
    }
    const values = {'angle-x': 15, 'angle-y': 0}
    const original = createParameterPreview({document: source, parameterValues: values})
    const editing = createParameterPreview({
      document,
      editingBindingId: document.parameterBindings[0]!.id,
      parameterValues: values,
    })
    expect(editing.parts[0]!.mesh.vertices).toEqual(original.parts[0]!.mesh.vertices)
    expect(
      createParameterPreview({document, parameterValues: values}).parts[0]!.mesh.vertices.at(-2),
    ).toBe(320 + 32 * weight)
    expect(document.parameterBindings[0]!.influences[0]!.points[0]!.weight).toBe(weight)
  }
})

const createGroupPreviewDocument = (offscreen: boolean, hasDrawOrder = true): PuppetDocument => {
  const vertices = [0, 0, 10, 0, 0, 10]
  return {
    ...createEmptyDocument(),
    parameterBindings: [
      {
        id: 'appearance',
        keyforms: [
          {
            groups: [{groupId: 'g', properties: {drawOrder: 100}}],
            parts: [{partId: 'inside', vertices}],
            values: [0],
          },
          {
            groups: [
              {
                groupId: 'g',
                properties: {
                  drawOrder: 800,
                  multiplyColor: [0.2, 0.4, 0.6],
                  opacity: 0.25,
                  screenColor: [0.1, 0.2, 0.3],
                },
              },
            ],
            parts: [{partId: 'inside', properties: {opacity: 0.6}, vertices}],
            values: [1],
          },
        ],
        parameterIds: ['p'],
        targetGroupIds: ['g'],
        targetPartIds: ['inside'],
      },
    ],
    parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'P'}],
    parts: ['inside', 'outside'].map((id) => ({
      id,
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices},
      texture: {height: 10, src: `${id}.png`, width: 10},
    })),
    scene: {
      roots: [
        {
          children: [
            {
              children: [
                {id: 'inside', kind: 'part', locked: false, name: 'Inside', visible: true},
              ],
              id: 'g',
              kind: 'group',
              locked: false,
              name: 'G',
              properties: {...(hasDrawOrder ? {drawOrder: 100} : {}), offscreen},
              visible: true,
            },
          ],
          id: 'parent',
          kind: 'group',
          locked: false,
          name: 'Parent',
          properties: {opacity: 0.75},
          visible: true,
        },
        {id: 'outside', kind: 'part', locked: false, name: 'Outside', visible: true},
      ],
    },
  }
}

describe('group keyform previews', () => {
  test.each(
    [
      {hasDrawOrder: true, offscreen: false},
      {hasDrawOrder: true, offscreen: true},
      {hasDrawOrder: false, offscreen: true},
    ].flatMap((group) => [0, 0.5, 1].map((value) => ({...group, value}))),
  )(
    'should retain nested group rendering at $value with offscreen=$offscreen and explicit order=$hasDrawOrder',
    ({hasDrawOrder, offscreen, value}) => {
      const document = createGroupPreviewDocument(offscreen, hasDrawOrder)
      expect(parseDocumentValue(document).ok).toBe(true)
      const parameterValues = {p: value}
      const preview = createParameterPreview({document, parameterValues})
      expect(preview.parameterBindings).toEqual([])
      expect(parseDocumentValue(preview).ok).toBe(true)
      expect(
        preview.scene?.roots[0]?.kind === 'group' && preview.scene.roots[0].properties?.drawOrder,
      ).toBeUndefined()
      expect(getPartRenderFrame(preview)).toEqual(getPartRenderFrame(document, parameterValues))
      expect(document.scene?.roots[0]).toEqual(
        createGroupPreviewDocument(offscreen, hasDrawOrder).scene?.roots[0],
      )
    },
  )
})

test('should retain preview dependencies for selections without influence edits', () => {
  const document = createDemoDocument()
  expect(getParameterEditingDocument(document)).toBe(document)
  expect(getParameterEditingDocument(document, 'missing')).toBe(document)
  expect(getParameterEditingDocument(document, document.parameterBindings![0]!.id)).toBe(document)
  const binding = document.parameterBindings![0]!
  const influenced = {
    ...document,
    parameterBindings: [
      {
        ...binding,
        influences: [{parameterId: 'angle-x', points: [{value: 0, weight: 0.5}]}],
      },
    ],
  }
  const editable = getParameterEditingDocument(influenced, binding.id)
  expect(editable.parameterBindings![0]!.influences).toBeUndefined()
  expect(influenced.parameterBindings[0]!.influences).toHaveLength(1)
})
