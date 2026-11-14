import type {PuppetDeformerShape, PuppetSceneDeformerNode} from '../player/document'
import {isEqual} from 'es-toolkit'

export const getDeformerShape = (node: PuppetDeformerShape): PuppetDeformerShape => ({
  boneRestPoints: node.boneRestPoints,
  boneWeights: node.boneWeights,
  bounds: {
    height: node.bounds.height,
    width: node.bounds.width,
    x: node.bounds.x,
    y: node.bounds.y,
  },
  columns: node.columns,
  controlPoints: node.controlPoints,
  curveAxis: node.curveAxis,
  curveBreaks: node.curveBreaks,
  curveHandles: node.curveHandles,
  deformerType: node.deformerType,
  interpolation: node.interpolation,
  pins: node.pins,
  rotationAngle: node.rotationAngle,
  rotationReferenceDistance: node.rotationReferenceDistance,
  rotationReflection: node.rotationReflection,
  rotationScale: node.rotationScale,
  rows: node.rows,
  vertexInfluences: node.vertexInfluences,
})

export const sameDeformerShape = (left: PuppetDeformerShape, right: PuppetDeformerShape): boolean =>
  isEqual(getDeformerShape(left), getDeformerShape(right))

/** Changes the control layout while preserving its existing point mapping. */
export const rebindDeformer = (
  before: PuppetSceneDeformerNode,
  after: PuppetSceneDeformerNode,
): PuppetSceneDeformerNode => {
  const {binding} = before
  const steps =
    binding === undefined
      ? [{shape: getDeformerShape(before)}]
      : sameDeformerShape(before, binding.rest)
        ? binding.steps
        : [...binding.steps, {rest: binding.rest, shape: getDeformerShape(before)}]
  return {...after, binding: {rest: getDeformerShape(after), steps}}
}
