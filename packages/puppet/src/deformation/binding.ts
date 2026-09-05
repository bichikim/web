import type {PuppetDeformerShape, PuppetSceneDeformerNode} from '../player/document'

export const getDeformerShape = (node: PuppetDeformerShape): PuppetDeformerShape => ({
  boneRestPoints: node.boneRestPoints,
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
  rows: node.rows,
  pins: node.pins,
})

export const sameDeformerShape = (left: PuppetDeformerShape, right: PuppetDeformerShape): boolean =>
  JSON.stringify(getDeformerShape(left)) === JSON.stringify(getDeformerShape(right))

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
