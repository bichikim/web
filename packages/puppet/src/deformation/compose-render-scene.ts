import type {
  PuppetDocument,
  PuppetScene,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
} from '../player/document'
import {getDocumentScene} from '../player/scene'
import {getRepeatRanges} from '../player/parameter-value'
import {getParameterBindingValues, type PuppetParameterValueMap} from './composition'
import {getBindingInfluence} from './influence'
import {createDeferredCoordinates} from './internal/deferred-coordinates'
import {createGridCoordinateSampler} from './sample-grid-coordinates'
import {composeParameterDeformer} from './scene'
import {getTargetBindings} from './target-bindings'

interface RenderSample {
  readonly parameterIds: ReadonlyArray<string>
  readonly values: ReadonlyArray<number | undefined>
  readonly node: PuppetSceneDeformerNode
}

const samplesByDocument = new WeakMap<
  PuppetDocument,
  WeakMap<PuppetSceneDeformerNode, RenderSample>
>()

interface CoordinateInput {
  readonly sample: (index: number) => number
  readonly weight: number
}

// Keep this closure outside the cache lookup scope so it cannot retain previous frames.
const composeCoordinates = (
  node: PuppetSceneDeformerNode,
  inputs: ReadonlyArray<CoordinateInput>,
): ReadonlyArray<number> =>
  createDeferredCoordinates({
    length: node.controlPoints.length,
    sample: (index) => {
      const rest = node.controlPoints[index]!
      let coordinate = rest
      for (const input of inputs) {
        coordinate += (input.sample(index) - rest) * input.weight
      }
      return coordinate
    },
  })

const composeRenderDeformer = (
  document: PuppetDocument,
  node: PuppetSceneDeformerNode,
  parameterValues: PuppetParameterValueMap | undefined,
): PuppetSceneDeformerNode => {
  const bindings = getTargetBindings(document.parameterBindings ?? [], 'targetDeformerIds', node.id)
  if (
    node.deformerType !== undefined ||
    node.interpolation === undefined ||
    node.boneRestPoints !== undefined ||
    node.curveAxis !== undefined ||
    node.curveHandles !== undefined ||
    node.pins !== undefined ||
    node.binding !== undefined ||
    node.rotationAngle !== undefined ||
    bindings.length === 0 ||
    bindings.some((binding) => binding.interpolation !== 'grid')
  ) {
    return composeParameterDeformer(document, node, parameterValues)
  }
  let samples = samplesByDocument.get(document)
  if (samples === undefined) {
    samples = new WeakMap()
    samplesByDocument.set(document, samples)
  }
  const previous = samples.get(node)
  if (
    previous !== undefined &&
    previous.parameterIds.every((id, index) =>
      Object.is(parameterValues?.[id], previous.values[index]),
    )
  ) {
    return previous.node
  }
  const inputs = bindings.map((binding) => {
    const sample = createGridCoordinateSampler({
      binding,
      keyformCoordinates: binding.keyforms.map(
        (form) => form.deformers?.find((candidate) => candidate.nodeId === node.id)?.controlPoints,
      ),
      repeatRanges: getRepeatRanges(binding.parameterIds, document.parameters),
      restCoordinates: node.controlPoints,
      values: getParameterBindingValues({binding, document, parameterValues}),
    })
    return {sample, weight: getBindingInfluence({binding, document, parameterValues})}
  })
  const posed = {
    ...node,
    controlPoints: composeCoordinates(node, inputs),
  }
  const parameterIds = previous?.parameterIds ?? [
    ...new Set(
      bindings.flatMap((binding) => [
        ...binding.parameterIds,
        ...(binding.influences ?? []).map((influence) => influence.parameterId),
      ]),
    ),
  ]
  samples.set(node, {
    node: posed,
    parameterIds,
    values: parameterIds.map((id) => parameterValues?.[id]),
  })
  return posed
}

/**
 * Frame-only geometry: dense native warp grids resolve their points on demand.
 * Use the canonical scene API for document data.
 */
export const composeRenderScene = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
): PuppetScene => {
  const compose = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<PuppetSceneNode> =>
    nodes.map((node) => {
      if (node.kind === 'part') {
        return node
      }
      const posed =
        node.kind === 'deformer' ? composeRenderDeformer(document, node, parameterValues) : node
      return {...posed, children: compose(posed.children)}
    })
  return {roots: compose(getDocumentScene(document).roots)}
}
