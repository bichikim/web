import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterDeformerKeyform,
  PuppetParameterKeyform,
  PuppetScene,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
} from '../player/document'
import {getDocumentScene} from '../player/scene'
import {type PuppetParameterValues, sampleParameterCoordinates} from './parameter'
import {getParameterBindingValues, type PuppetParameterValueMap} from './composition'

const CURVE_HANDLE_COORDINATE_COUNT = 4
const HORIZONTAL_Y_OFFSET = 1
const VERTICAL_X_OFFSET = 2
const VERTICAL_Y_OFFSET = 3

export const createDeformerKeyform = (
  node: PuppetSceneDeformerNode,
): PuppetParameterDeformerKeyform => ({
  controlPoints: node.controlPoints,
  ...(node.curveHandles === undefined ? {} : {curveHandles: node.curveHandles}),
  kind: node.kind,
  nodeId: node.id,
})

const getKeyformCoordinates = (
  keyform: PuppetParameterKeyform,
  deformer: PuppetSceneDeformerNode,
) => keyform.deformers?.find((candidate) => candidate.nodeId === deformer.id)?.controlPoints

const getRestCoordinates = (deformer: PuppetSceneDeformerNode) => deformer.controlPoints

const getCurveHandleCoordinates = (
  handles: PuppetParameterDeformerKeyform['curveHandles'],
  deformer: PuppetSceneDeformerNode,
) =>
  (deformer.curveHandles ?? []).flatMap((restHandle) => {
    const handle =
      handles?.find((candidate) => candidate.pointIndex === restHandle.pointIndex) ?? restHandle
    return [handle.horizontal.x, handle.horizontal.y, handle.vertical.x, handle.vertical.y]
  })

const createCurveHandles = (
  deformer: PuppetSceneDeformerNode,
  coordinates: ReadonlyArray<number>,
) =>
  deformer.curveHandles?.map((handle, index) => ({
    horizontal: {
      x: coordinates[index * CURVE_HANDLE_COORDINATE_COUNT] ?? handle.horizontal.x,
      y:
        coordinates[index * CURVE_HANDLE_COORDINATE_COUNT + HORIZONTAL_Y_OFFSET] ??
        handle.horizontal.y,
    },
    pointIndex: handle.pointIndex,
    vertical: {
      x:
        coordinates[index * CURVE_HANDLE_COORDINATE_COUNT + VERTICAL_X_OFFSET] ?? handle.vertical.x,
      y:
        coordinates[index * CURVE_HANDLE_COORDINATE_COUNT + VERTICAL_Y_OFFSET] ?? handle.vertical.y,
    },
  }))

const createSampledDeformer = (
  deformer: PuppetSceneDeformerNode,
  coordinates: ReadonlyArray<number>,
  curveHandleCoordinates: ReadonlyArray<number> = getCurveHandleCoordinates(
    deformer.curveHandles,
    deformer,
  ),
): PuppetParameterDeformerKeyform => ({
  controlPoints: coordinates,
  ...(deformer.curveHandles === undefined
    ? {}
    : {curveHandles: createCurveHandles(deformer, curveHandleCoordinates)}),
  kind: deformer.kind,
  nodeId: deformer.id,
})

const addDeformerDelta = (
  current: ReadonlyArray<number>,
  sampled: ReadonlyArray<number>,
  rest: ReadonlyArray<number>,
) =>
  rest.map(
    (coordinate, index) =>
      (current[index] ?? coordinate) + (sampled[index] ?? coordinate) - coordinate,
  )

export interface SampleParameterDeformerOptions {
  readonly binding: PuppetParameterBinding
  readonly deformer: PuppetSceneDeformerNode
  readonly values: PuppetParameterValues
}

export const sampleParameterDeformer = (
  options: SampleParameterDeformerOptions,
): PuppetParameterDeformerKeyform =>
  createSampledDeformer(
    options.deformer,
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: options.binding.keyforms.map((keyform) =>
        getKeyformCoordinates(keyform, options.deformer),
      ),
      restCoordinates: getRestCoordinates(options.deformer),
      values: options.values,
    }),
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: options.binding.keyforms.map((keyform) =>
        getCurveHandleCoordinates(
          keyform.deformers?.find((candidate) => candidate.nodeId === options.deformer.id)
            ?.curveHandles,
          options.deformer,
        ),
      ),
      restCoordinates: getCurveHandleCoordinates(options.deformer.curveHandles, options.deformer),
      values: options.values,
    }),
  )

const composeDeformer = (
  document: PuppetDocument,
  deformer: PuppetSceneDeformerNode,
  parameterValues: PuppetParameterValueMap | undefined,
) => {
  const restCoordinates = getRestCoordinates(deformer)
  const restCurveHandleCoordinates = getCurveHandleCoordinates(deformer.curveHandles, deformer)
  let coordinates = restCoordinates
  let curveHandleCoordinates = restCurveHandleCoordinates

  for (const binding of document.parameterBindings ?? []) {
    if (binding.targetDeformerIds?.includes(deformer.id) === true) {
      const sampled = sampleParameterDeformer({
        binding,
        deformer,
        values: getParameterBindingValues({binding, document, parameterValues}),
      })
      coordinates = addDeformerDelta(coordinates, sampled.controlPoints, restCoordinates)
      curveHandleCoordinates = addDeformerDelta(
        curveHandleCoordinates,
        getCurveHandleCoordinates(sampled.curveHandles, deformer),
        restCurveHandleCoordinates,
      )
    }
  }

  const sampled = createSampledDeformer(deformer, coordinates, curveHandleCoordinates)
  return {...deformer, controlPoints: sampled.controlPoints, curveHandles: sampled.curveHandles}
}

const composeSceneNodes = (
  document: PuppetDocument,
  nodes: ReadonlyArray<PuppetSceneNode>,
  parameterValues: PuppetParameterValueMap | undefined,
): ReadonlyArray<PuppetSceneNode> =>
  nodes.map((node) => {
    if (node.kind === 'part') {
      return node
    }
    const children = composeSceneNodes(document, node.children, parameterValues)
    return node.kind === 'group'
      ? {...node, children}
      : {...composeDeformer(document, node, parameterValues), children}
  })

export const composeParameterScene = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
): PuppetScene => ({
  roots: composeSceneNodes(document, getDocumentScene(document).roots, parameterValues),
})
