import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {
  addParameter,
  insertParameterKeyform,
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerCurveHandle,
  setParameterKeyformDeformerPoint,
} from '../parameter-keyforms'
import {createParameterPreview, sampleParameterVertices} from '../parameter-sampling'
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

describe('createParameterPreview', () => {
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
    const added = addParameter({document: deformed, nodeIds: [deformer.id]})!
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
    const added = addParameter({document: withHandle, nodeIds: [deformer.id]})!
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
