import {sampleParameterDeformer} from '../../../deformation/scene'
import {addTwoDimensionalParameter} from '../parameter-keyforms'
import {setDeformerControlPoint} from '../deformer-control-points'
import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument} from '../../../player'
import {transformDeformerPoint} from '../../../deformation'
import {createCurveDeformer, getSceneNode} from '../scene-graph'
import {editCurveTopology} from '../curve-topology'

test('should split without changing the deformed surface and merge the split back', () => {
  const source = createCurveDeformer(createDemoDocument(), ['mesh-preview'])!
  const first = getSceneNode(source, 'curve')!
  if (first.kind !== 'deformer') {
    throw new Error('Expected deformer')
  }
  const split = editCurveTopology({
    document: source,
    index: 0,
    nodeId: first.id,
    operation: 'split',
  })!
  const node = getSceneNode(split, 'curve')!
  if (node.kind !== 'deformer') {
    throw new Error('Expected deformer')
  }
  expect(node.controlPoints).toHaveLength(14)
  expect(node.curveBreaks).toEqual([0, 0.5, 1])
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    const point = {
      x: first.bounds.x + progress * first.bounds.width,
      y: first.bounds.y + first.bounds.height * 0.3,
    }
    const before = transformDeformerPoint(first, point)
    const after = transformDeformerPoint(node, point)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  }
  expect(parseDocument(JSON.stringify(split)).ok).toBe(true)
  const merged = editCurveTopology({
    document: split,
    index: 1,
    nodeId: first.id,
    operation: 'remove',
  })!
  const restored = getSceneNode(merged, 'curve')!
  if (restored.kind !== 'deformer') {
    throw new Error('Expected deformer')
  }
  restored.controlPoints.forEach((coordinate, index) =>
    expect(coordinate).toBeCloseTo(first.controlPoints[index]!),
  )
})

test('should preserve curved keyforms when splitting a nonuniform interval', () => {
  const source = createCurveDeformer(createDemoDocument(), ['mesh-preview'])!
  const bent = setDeformerControlPoint({
    document: source,
    nodeId: 'curve',
    pointIndex: 1,
    x: 150,
    y: 400,
  })!
  const added = addTwoDimensionalParameter({document: bent, nodeIds: ['curve']})!
  const split = editCurveTopology({
    document: added.document,
    index: 0,
    nodeId: 'curve',
    operation: 'split',
    ratio: 0.3,
  })!
  const again = editCurveTopology({document: split, index: 0, nodeId: 'curve', operation: 'split'})!
  const before = getSceneNode(added.document, 'curve')!
  const after = getSceneNode(again, 'curve')!
  if (before.kind !== 'deformer' || after.kind !== 'deformer') {
    throw new Error('Expected curve')
  }
  expect(after.curveBreaks).toEqual([0, 0.15, 0.3, 1])
  const original = added.document.parameterBindings!.at(-1)!
  const updated = again.parameterBindings!.at(-1)!
  for (const keyform of updated.keyforms) {
    expect(keyform.deformers![0]!.controlPoints.length).toBe(20)
  }
  for (const value of [original.keyforms[0]!.values, original.keyforms.at(-1)!.values]) {
    const first = sampleParameterDeformer({binding: original, deformer: before, values: value})
    const second = sampleParameterDeformer({binding: updated, deformer: after, values: value})
    for (const progress of [0.1, 0.3, 0.6, 0.9]) {
      const point = {
        x: before.bounds.x + before.bounds.width * progress,
        y: before.bounds.y + before.bounds.height * 0.4,
      }
      const left = transformDeformerPoint({...before, controlPoints: first.controlPoints}, point)
      const right = transformDeformerPoint({...after, controlPoints: second.controlPoints}, point)
      expect(right.x).toBeCloseTo(left.x)
      expect(right.y).toBeCloseTo(left.y)
    }
  }
  expect(parseDocument(JSON.stringify(again)).ok).toBe(true)
  expect(
    editCurveTopology({document: again, index: 0, nodeId: 'curve', operation: 'remove'}),
  ).toBeUndefined()
})

test.each([0, 1, -0.1, Number.NaN])('should reject invalid split ratio %s', (ratio) => {
  const document = createCurveDeformer(createDemoDocument(), ['mesh-preview'])!
  expect(
    editCurveTopology({document, index: 0, nodeId: 'curve', operation: 'split', ratio}),
  ).toBeUndefined()
})
