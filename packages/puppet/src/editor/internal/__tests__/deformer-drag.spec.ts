import {describe, expect, test} from 'vitest'
import {
  createDemoDocument,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
} from '../../../player'
import {updateDraggedDeformer} from '../deformer-drag'
import {
  addParameter,
  addTwoDimensionalParameter,
  setParameterKeyformDeformerControlPoints,
} from '../parameter-keyforms'
import {createParameterPreview} from '../parameter-sampling'
import {getSceneNode} from '../scene-graph'

const rest: PuppetSceneDeformerNode = {
  bounds: {height: 100, width: 100, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
  curveHandles: [{horizontal: {x: 10, y: 0}, pointIndex: 0, vertical: {x: 0, y: 10}}],
  id: 'deformer',
  kind: 'deformer',
  locked: false,
  name: 'Deformer',
  rows: 1,
  rotationOrigin: {x: 50, y: 50},
  visible: true,
}

const createBindings = (twoDimensional: boolean) => {
  const initial = {
    ...createDemoDocument(),
    parameterBindings: [],
    parameters: [],
    scene: {roots: [rest]},
  }
  const first = (twoDimensional ? addTwoDimensionalParameter : addParameter)({
    document: initial,
    nodeIds: [rest.id],
  })!
  const values = twoDimensional ? ([0, 0] as const) : ([0] as const)
  const firstPose = setParameterKeyformDeformerControlPoints({
    bindingId: first.binding.id,
    controlPoints: rest.controlPoints.map(
      (coordinate, index) => coordinate + (index % 2 === 0 ? 10 : 0),
    ),
    curveHandles: [{horizontal: {x: 20, y: 0}, pointIndex: 0, vertical: {x: 10, y: 10}}],
    document: first.document,
    nodeId: rest.id,
    rotationOrigin: {x: 60, y: 50},
    values,
  })!
  const second = addParameter({document: firstPose, nodeIds: [rest.id]})!
  const document = setParameterKeyformDeformerControlPoints({
    bindingId: second.binding.id,
    controlPoints: rest.controlPoints.map(
      (coordinate, index) => coordinate + (index % 2 === 0 ? 20 : 0),
    ),
    curveHandles: [{horizontal: {x: 30, y: 0}, pointIndex: 0, vertical: {x: 20, y: 10}}],
    document: second.document,
    nodeId: rest.id,
    rotationOrigin: {x: 70, y: 50},
    values: [0],
  })!
  return {bindingId: first.binding.id, document, values}
}

describe('updateDraggedDeformer', () => {
  test.each([false, true])(
    'should translate and rotate composed geometry without storing other binding deltas (2D: %s)',
    (twoDimensional) => {
      const setup = createBindings(twoDimensional)
      const preview = (document: PuppetDocument) =>
        getSceneNode(
          createParameterPreview({document, editingBindingId: setup.bindingId}),
          rest.id,
        ) as PuppetSceneDeformerNode
      const options = {
        activeBindingId: setup.bindingId,
        activeKeyformValues: setup.values,
        editMode: 'parameter' as const,
        nodeId: rest.id,
        targetNodeIds: [rest.id],
      }
      const translated = updateDraggedDeformer({
        ...options,
        deformer: preview(setup.document),
        document: setup.document,
        point: {x: 5, y: 7},
        target: {kind: 'translation', previousPoint: {x: 0, y: 0}},
      })!
      expect(preview(translated).controlPoints).toEqual([35, 7, 135, 7, 35, 107, 135, 107])
      expect(preview(translated).curveHandles?.[0]).toEqual({
        horizontal: {x: 45, y: 7},
        pointIndex: 0,
        vertical: {x: 35, y: 17},
      })
      expect(preview(translated).rotationOrigin).toEqual({x: 85, y: 57})
      const start = preview(translated)
      const rotate = (document: PuppetDocument) =>
        updateDraggedDeformer({
          ...options,
          deformer: start,
          document,
          point: {x: 85, y: 157},
          previewDeformer: preview(document),
          rotationAngle: 0,
          target: {kind: 'rotation'},
        })!
      const rotated = rotate(translated)
      const repeated = rotate(rotated)
      expect(preview(repeated).controlPoints[0]).toBeCloseTo(135)
      expect(preview(repeated).controlPoints[1]).toBeCloseTo(7)
      expect(preview(repeated).curveHandles?.[0]?.horizontal.x).toBeCloseTo(135)
      expect(preview(repeated).curveHandles?.[0]?.horizontal.y).toBeCloseTo(17)
      expect(preview(repeated).rotationOrigin).toEqual({x: 85, y: 57})
      expect(repeated.parameterBindings?.[1]).toEqual(setup.document.parameterBindings?.[1])
      expect(repeated.scene).toEqual(setup.document.scene)
    },
  )

  test('should remove weighted inactive contributions while editing a suppressed active binding', () => {
    const setup = createBindings(true)
    const source = {
      ...setup.document,
      parameterBindings: setup.document.parameterBindings.map((binding, index) => ({
        ...binding,
        influences: [
          {
            parameterId: binding.parameterIds[0],
            points: [{value: 0, weight: index === 0 ? 0 : 0.25}],
          },
        ],
      })),
    }
    const deformer = getSceneNode(
      createParameterPreview({document: source, editingBindingId: setup.bindingId}),
      rest.id,
    ) as PuppetSceneDeformerNode
    expect(deformer.controlPoints[0]).toBe(15)
    const document = updateDraggedDeformer({
      activeBindingId: setup.bindingId,
      activeKeyformValues: setup.values,
      deformer,
      document: source,
      editMode: 'parameter',
      nodeId: rest.id,
      point: {x: 16, y: 2},
      target: {kind: 'controlPoint', pointIndex: 0},
      targetNodeIds: [rest.id],
    })!
    const preview = getSceneNode(
      createParameterPreview({document, editingBindingId: setup.bindingId}),
      rest.id,
    ) as PuppetSceneDeformerNode
    expect(preview.controlPoints.slice(0, 2)).toEqual([16, 2])
    expect(preview.curveHandles?.[0]).toEqual({
      horizontal: {x: 26, y: 2},
      pointIndex: 0,
      vertical: {x: 16, y: 12},
    })
    expect(
      document.parameterBindings?.[0]?.keyforms
        .find((keyform) => keyform.values.every((value) => value === 0))
        ?.deformers?.[0]?.controlPoints.slice(0, 2),
    ).toEqual([11, 2])
    expect(document.parameterBindings?.[1]).toEqual(source.parameterBindings[1])
  })

  test.each(['horizontal', 'vertical'] as const)(
    'should edit only the selected %s curve handle',
    (axis) => {
      const setup = createBindings(true)
      const deformer = getSceneNode(
        createParameterPreview({document: setup.document, editingBindingId: setup.bindingId}),
        rest.id,
      ) as PuppetSceneDeformerNode
      const point = deformer.curveHandles![0]![axis]
      const document = updateDraggedDeformer({
        activeBindingId: setup.bindingId,
        activeKeyformValues: setup.values,
        deformer,
        document: setup.document,
        editMode: 'parameter',
        nodeId: rest.id,
        point: {x: point.x + 1, y: point.y + 2},
        target: {axis, kind: 'curveHandle', pointIndex: 0},
        targetNodeIds: [rest.id],
      })!
      const result = getSceneNode(
        createParameterPreview({document, editingBindingId: setup.bindingId}),
        rest.id,
      ) as PuppetSceneDeformerNode
      expect(result.curveHandles?.[0]?.[axis]).toEqual({x: point.x + 1, y: point.y + 2})
      expect(result.controlPoints).toEqual(deformer.controlPoints)
      expect(document.parameterBindings?.[1]).toEqual(setup.document.parameterBindings?.[1])
    },
  )
})
