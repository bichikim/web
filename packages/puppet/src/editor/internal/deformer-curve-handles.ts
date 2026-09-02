import {isTwoDimensionalParameterBinding} from '../../deformation'
import {
  createDeformerCurveHandle,
  getDocumentScene,
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
