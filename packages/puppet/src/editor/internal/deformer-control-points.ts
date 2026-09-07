import {moveCurveHandles} from './curve-control-points'
import {
  getDocumentScene,
  type PuppetDeformerCurveHandle,
  type PuppetDocument,
  type PuppetPoint,
  type PuppetScene,
  type PuppetSceneDeformerNode,
} from '../../player'
import {findNode, findNodeLock, updateNode} from './scene-tree'

interface SetDeformerControlPointOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly pointIndex: number
  readonly x: number
  readonly y: number
}

interface SetDeformerControlPointsOptions {
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly rotationOrigin?: PuppetPoint
}

const withScene = (document: PuppetDocument, scene: PuppetScene): PuppetDocument => ({
  ...document,
  scene,
})

export const setDeformerControlPoints = (
  options: SetDeformerControlPointsOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)

  if (
    node?.kind !== 'deformer' ||
    findNodeLock(scene.roots, options.nodeId) === true ||
    options.controlPoints.length !== node.controlPoints.length ||
    options.controlPoints.some((coordinate) => !Number.isFinite(coordinate)) ||
    (options.rotationOrigin !== undefined &&
      (!Number.isFinite(options.rotationOrigin.x) || !Number.isFinite(options.rotationOrigin.y))) ||
    (options.curveHandles !== undefined &&
      (options.curveHandles.length !== (node.curveHandles?.length ?? 0) ||
        options.curveHandles.some(
          (handle) =>
            node.curveHandles?.some((candidate) => candidate.pointIndex === handle.pointIndex) !==
              true ||
            !Number.isFinite(handle.horizontal.x) ||
            !Number.isFinite(handle.horizontal.y) ||
            !Number.isFinite(handle.vertical.x) ||
            !Number.isFinite(handle.vertical.y),
        )))
  ) {
    return undefined
  }

  return withScene(options.document, {
    ...scene,
    roots: updateNode(scene.roots, options.nodeId, (candidate) => ({
      ...(candidate as PuppetSceneDeformerNode),
      controlPoints: options.controlPoints,
      ...(options.curveHandles === undefined ? {} : {curveHandles: options.curveHandles}),
      ...(options.rotationOrigin === undefined ? {} : {rotationOrigin: options.rotationOrigin}),
    })),
  })
}

export const setDeformerControlPoint = (
  options: SetDeformerControlPointOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)

  if (
    node?.kind !== 'deformer' ||
    findNodeLock(scene.roots, options.nodeId) === true ||
    !Number.isInteger(options.pointIndex) ||
    options.pointIndex < 0 ||
    options.pointIndex >= node.controlPoints.length / 2 ||
    !Number.isFinite(options.x) ||
    !Number.isFinite(options.y)
  ) {
    return undefined
  }

  let controlPoints = [...node.controlPoints]
  const previousX = controlPoints[options.pointIndex * 2] ?? 0
  const previousY = controlPoints[options.pointIndex * 2 + 1] ?? 0
  controlPoints[options.pointIndex * 2] = options.x
  controlPoints[options.pointIndex * 2 + 1] = options.y
  if (node.curveAxis !== undefined) {
    controlPoints = moveCurveHandles({
      controlPoints,
      offsetX: options.x - previousX,
      offsetY: options.y - previousY,
      pointIndex: options.pointIndex,
    })
  }
  const curveHandles = node.curveHandles?.map((handle) =>
    handle.pointIndex === options.pointIndex
      ? {
          ...handle,
          horizontal: {
            x: handle.horizontal.x + options.x - previousX,
            y: handle.horizontal.y + options.y - previousY,
          },
          vertical: {
            x: handle.vertical.x + options.x - previousX,
            y: handle.vertical.y + options.y - previousY,
          },
        }
      : handle,
  )

  return withScene(options.document, {
    ...scene,
    roots: updateNode(scene.roots, options.nodeId, (candidate) => ({
      ...(candidate as PuppetSceneDeformerNode),
      controlPoints,
      curveHandles,
    })),
  })
}
