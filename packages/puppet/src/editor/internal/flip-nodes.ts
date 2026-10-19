import {
  getDocumentScene,
  isSceneContainerNode,
  type PuppetDocument,
  type PuppetMotion,
  type PuppetParameterBinding,
  type PuppetSceneNode,
} from '../../player'
import {mapBindingKeyforms} from '../../deformation'
import {
  type Mirror,
  mirrorCoordinates,
  mirrorDeformerForm,
  mirrorDeformerShape,
  mirrorMesh,
} from './mirror-geometry'
import {findNodeLock} from './scene-tree'

/** Where the mirror line passes: the selection's own center or the canvas center. */
export type FlipReference = 'canvas' | 'selection'

export interface FlipSceneNodesOptions {
  readonly axis: Mirror['axis']
  readonly document: PuppetDocument
  readonly nodeIds: ReadonlyArray<string>
  readonly reference: FlipReference
}

export type FlipSceneNodesResult =
  | {readonly document: PuppetDocument; readonly ok: true}
  | {readonly message: string; readonly ok: false}

/** The selected nodes and everything inside them. */
const collectSubtree = (document: PuppetDocument, nodeIds: ReadonlySet<string>) => {
  const nodes: PuppetSceneNode[] = []
  const visit = (candidates: ReadonlyArray<PuppetSceneNode>, inside: boolean) => {
    for (const node of candidates) {
      const included = inside || nodeIds.has(node.id)
      if (included) {
        nodes.push(node)
      }
      if (isSceneContainerNode(node)) {
        visit(node.children, included)
      }
    }
  }
  visit(getDocumentScene(document).roots, false)
  return nodes
}

/** Why the subtree cannot be flipped, or `undefined` when it can. */
export const getFlipBlocker = (
  document: PuppetDocument,
  nodeIds: ReadonlyArray<string>,
): string | undefined => {
  const nodes = collectSubtree(document, new Set(nodeIds))
  const {roots} = getDocumentScene(document)
  if (nodes.length === 0) {
    return '반전할 레이어를 선택하세요.'
  }
  if (nodes.some((node) => findNodeLock(roots, node.id) === true)) {
    return '잠긴 레이어가 있어 반전할 수 없습니다.'
  }
  const parts = new Map(document.parts.map((part) => [part.id, part]))
  const unsupported = nodes.some((node) =>
    node.kind === 'part'
      ? node.skinning !== undefined || parts.get(node.id)?.spatial !== undefined
      : node.kind === 'deformer' &&
        (node.deformerType === 'spatial' ||
          node.spatialMesh !== undefined ||
          node.curveAxis !== undefined),
  )
  return unsupported ? '3D·곡선 디포머, 3D 파트, 스키닝된 파트는 반전할 수 없습니다.' : undefined
}

/** The middle of the subtree's rest geometry along the axis. */
const getSelectionCenter = (
  document: PuppetDocument,
  nodes: ReadonlyArray<PuppetSceneNode>,
  axis: Mirror['axis'],
) => {
  const offset = axis === 'x' ? 0 : 1
  const coordinates = nodes.flatMap((node) => {
    const points =
      node.kind === 'part'
        ? (document.parts.find((part) => part.id === node.id)?.mesh.vertices ?? [])
        : node.kind === 'deformer'
          ? node.controlPoints
          : []
    return points.filter((_, index) => index % 2 === offset)
  })
  return coordinates.length === 0
    ? undefined
    : (Math.min(...coordinates) + Math.max(...coordinates)) / 2
}

const mirrorBinding = (
  binding: PuppetParameterBinding,
  partIds: ReadonlySet<string>,
  deformers: ReadonlyMap<string, Extract<PuppetSceneNode, {kind: 'deformer'}>>,
  mirror: Mirror,
) =>
  mapBindingKeyforms(binding, (keyform) => ({
    ...keyform,
    deformers: keyform.deformers?.map((entry) => {
      const node = deformers.get(entry.nodeId)
      return node === undefined ? entry : mirrorDeformerForm(entry, node, mirror)
    }),
    parts: keyform.parts.map((entry) =>
      partIds.has(entry.partId) && entry.vertices.length > 0
        ? {...entry, vertices: mirrorCoordinates(entry.vertices, mirror)}
        : entry,
    ),
  }))

/**
 * Motions with the flipped parts' vertex curves reflected like their meshes: vertex curves hold
 * absolute coordinates, so only those on the mirrored axis change.
 */
const mirrorVertexTracks = (
  motions: ReadonlyArray<PuppetMotion>,
  partIds: ReadonlySet<string>,
  mirror: Mirror,
) =>
  motions.map((motion) => ({
    ...motion,
    tracks: motion.tracks.map((track) =>
      track.kind === 'vertex' && track.axis === mirror.axis && partIds.has(track.partId)
        ? {
            ...track,
            keyframes: track.keyframes.map((keyframe) => ({
              ...keyframe,
              value: 2 * mirror.center - keyframe.value,
            })),
          }
        : track,
    ),
  }))

const mirrorSceneNodes = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  flipped: ReadonlySet<string>,
  mirror: Mirror,
): ReadonlyArray<PuppetSceneNode> =>
  nodes.map((node) => {
    if (!isSceneContainerNode(node)) {
      return node
    }
    const children = mirrorSceneNodes(node.children, flipped, mirror)
    if (node.kind !== 'deformer' || !flipped.has(node.id)) {
      return {...node, children}
    }
    const {binding} = node
    return {
      ...mirrorDeformerShape(node, mirror),
      ...(binding === undefined
        ? {}
        : {
            binding: {
              rest: mirrorDeformerShape(binding.rest, mirror),
              steps: binding.steps.map((step) => ({
                ...(step.rest === undefined ? {} : {rest: mirrorDeformerShape(step.rest, mirror)}),
                shape: mirrorDeformerShape(step.shape, mirror),
              })),
            },
          }),
      children,
    }
  })

/**
 * Flips the selected layers and everything inside them across a vertical (`x`) or horizontal
 * (`y`) line (Cubism's object flip): meshes, deformer layouts including rotation deformer
 * pivots, their keyforms and motion vertex curves, so the movement is mirrored too.
 */
export const flipSceneNodes = (options: FlipSceneNodesOptions): FlipSceneNodesResult => {
  const {axis, document} = options
  const blocker = getFlipBlocker(document, options.nodeIds)
  if (blocker !== undefined) {
    return {message: blocker, ok: false}
  }
  const nodes = collectSubtree(document, new Set(options.nodeIds))
  const center =
    options.reference === 'canvas'
      ? (axis === 'x' ? document.viewport.width : document.viewport.height) / 2
      : getSelectionCenter(document, nodes, axis)
  if (center === undefined) {
    return {message: '반전할 도형이 없습니다.', ok: false}
  }
  const mirror = {axis, center}
  const partIds = new Set(nodes.flatMap((node) => (node.kind === 'part' ? [node.id] : [])))
  const deformers = new Map(
    nodes.flatMap((node) => (node.kind === 'deformer' ? [[node.id, node] as const] : [])),
  )
  return {
    document: {
      ...document,
      motions: mirrorVertexTracks(document.motions, partIds, mirror),
      parameterBindings: document.parameterBindings?.map((binding) =>
        mirrorBinding(binding, partIds, deformers, mirror),
      ),
      parts: document.parts.map((part) =>
        partIds.has(part.id) ? {...part, mesh: mirrorMesh(part.mesh, mirror)} : part,
      ),
      scene: {
        roots: mirrorSceneNodes(
          getDocumentScene(document).roots,
          new Set(deformers.keys()),
          mirror,
        ),
      },
    },
    ok: true,
  }
}
