import {isTwoDimensionalParameterBinding} from '../../deformation'
import {
  getDocumentScene,
  type PuppetDeformerCurveHandle,
  type PuppetDocument,
  type PuppetParameterBinding,
  type PuppetParameterKeyform,
  type PuppetPoint,
  type PuppetScene,
  type PuppetSceneDeformerNode,
} from '../../player'
import {findNode, findNodeLock, updateNode} from './scene-tree'

interface SetDeformerCurveHandleOptions {
  readonly axis: 'horizontal' | 'vertical'
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly point: PuppetPoint
  readonly pointIndex: number
}

const BEZIER_TANGENT_MULTIPLIER = 3
const COORDINATES_PER_POINT = 2

const getControlPoint = (
  node: PuppetSceneDeformerNode,
  column: number,
  row: number,
): PuppetPoint => {
  const coordinateIndex = (row * (node.columns + 1) + column) * COORDINATES_PER_POINT
  return {
    x: node.controlPoints[coordinateIndex] ?? 0,
    y: node.controlPoints[coordinateIndex + 1] ?? 0,
  }
}

const getPointTangent = (
  previous: PuppetPoint | undefined,
  point: PuppetPoint,
  next: PuppetPoint | undefined,
): PuppetPoint => {
  if (previous !== undefined && next !== undefined) {
    return {x: (next.x - previous.x) / 2, y: (next.y - previous.y) / 2}
  }

  return next === undefined
    ? {x: point.x - (previous?.x ?? point.x), y: point.y - (previous?.y ?? point.y)}
    : {x: next.x - point.x, y: next.y - point.y}
}

export const createDeformerCurveHandle = (
  node: PuppetSceneDeformerNode,
  pointIndex: number,
): PuppetDeformerCurveHandle | undefined => {
  const pointCount = (node.columns + 1) * (node.rows + 1)
  if (!Number.isInteger(pointIndex) || pointIndex < 0 || pointIndex >= pointCount) {
    return undefined
  }

  const column = pointIndex % (node.columns + 1)
  const row = Math.floor(pointIndex / (node.columns + 1))
  const point = getControlPoint(node, column, row)
  const horizontalTangent = getPointTangent(
    column === 0 ? undefined : getControlPoint(node, column - 1, row),
    point,
    column === node.columns ? undefined : getControlPoint(node, column + 1, row),
  )
  const verticalTangent = getPointTangent(
    row === 0 ? undefined : getControlPoint(node, column, row - 1),
    point,
    row === node.rows ? undefined : getControlPoint(node, column, row + 1),
  )

  return {
    horizontal: {
      x: point.x + horizontalTangent.x / BEZIER_TANGENT_MULTIPLIER,
      y: point.y + horizontalTangent.y / BEZIER_TANGENT_MULTIPLIER,
    },
    pointIndex,
    vertical: {
      x: point.x + verticalTangent.x / BEZIER_TANGENT_MULTIPLIER,
      y: point.y + verticalTangent.y / BEZIER_TANGENT_MULTIPLIER,
    },
  }
}

const withScene = (document: PuppetDocument, scene: PuppetScene): PuppetDocument => ({
  ...document,
  scene,
})

const updateParameterDeformerKeyforms = (
  document: PuppetDocument,
  nodeId: string,
  update: (
    deformer: NonNullable<PuppetParameterKeyform['deformers']>[number],
  ) => NonNullable<PuppetParameterKeyform['deformers']>[number],
) => {
  if (document.parameterBindings === undefined) {
    return document
  }

  const updateKeyform = <Keyform extends PuppetParameterKeyform>(keyform: Keyform): Keyform =>
    ({
      ...keyform,
      deformers: keyform.deformers?.map((deformer) =>
        deformer.nodeId === nodeId ? update(deformer) : deformer,
      ),
    }) as Keyform

  return {
    ...document,
    parameterBindings: document.parameterBindings.map(
      (binding): PuppetParameterBinding =>
        isTwoDimensionalParameterBinding(binding)
          ? {...binding, keyforms: binding.keyforms.map(updateKeyform)}
          : {...binding, keyforms: binding.keyforms.map(updateKeyform)},
    ),
  }
}

export const addDeformerCurveHandle = (
  document: PuppetDocument,
  nodeId: string,
  pointIndex: number,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(document)
  const node = findNode(scene.roots, nodeId)
  const handle = node?.kind === 'deformer' ? createDeformerCurveHandle(node, pointIndex) : undefined

  if (
    node?.kind !== 'deformer' ||
    handle === undefined ||
    findNodeLock(scene.roots, nodeId) === true ||
    node.curveHandles?.some((candidate) => candidate.pointIndex === pointIndex) === true
  ) {
    return undefined
  }

  const nextDocument = withScene(document, {
    ...scene,
    roots: updateNode(scene.roots, nodeId, (candidate) => ({
      ...(candidate as PuppetSceneDeformerNode),
      curveHandles: [...(node.curveHandles ?? []), handle].sort(
        (first, second) => first.pointIndex - second.pointIndex,
      ),
    })),
  })

  return updateParameterDeformerKeyforms(nextDocument, nodeId, (deformer) => {
    const keyformHandle = createDeformerCurveHandle(
      {...node, controlPoints: deformer.controlPoints},
      pointIndex,
    )
    return keyformHandle === undefined
      ? deformer
      : {
          ...deformer,
          curveHandles: [...(deformer.curveHandles ?? []), keyformHandle].sort(
            (first, second) => first.pointIndex - second.pointIndex,
          ),
        }
  })
}

export const removeDeformerCurveHandle = (
  document: PuppetDocument,
  nodeId: string,
  pointIndex: number,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(document)
  const node = findNode(scene.roots, nodeId)

  if (
    node?.kind !== 'deformer' ||
    findNodeLock(scene.roots, nodeId) === true ||
    node.curveHandles?.some((handle) => handle.pointIndex === pointIndex) !== true
  ) {
    return undefined
  }

  const nextDocument = withScene(document, {
    ...scene,
    roots: updateNode(scene.roots, nodeId, (candidate) => ({
      ...(candidate as PuppetSceneDeformerNode),
      curveHandles: node.curveHandles?.filter((handle) => handle.pointIndex !== pointIndex),
    })),
  })

  return updateParameterDeformerKeyforms(nextDocument, nodeId, (deformer) => ({
    ...deformer,
    curveHandles: deformer.curveHandles?.filter((handle) => handle.pointIndex !== pointIndex),
  }))
}

export const setDeformerCurveHandle = (
  options: SetDeformerCurveHandleOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)

  if (
    node?.kind !== 'deformer' ||
    findNodeLock(scene.roots, options.nodeId) === true ||
    !Number.isFinite(options.point.x) ||
    !Number.isFinite(options.point.y) ||
    node.curveHandles?.some((handle) => handle.pointIndex === options.pointIndex) !== true
  ) {
    return undefined
  }

  return withScene(options.document, {
    ...scene,
    roots: updateNode(scene.roots, options.nodeId, (candidate) => ({
      ...(candidate as PuppetSceneDeformerNode),
      curveHandles: node.curveHandles?.map((handle) =>
        handle.pointIndex === options.pointIndex
          ? {...handle, [options.axis]: options.point}
          : handle,
      ),
    })),
  })
}
