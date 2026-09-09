import type {PuppetSkinOptions} from '../../player/document'
import {synchronizeSkinSeams} from './skin-seams'
import {
  createConfiguredSkinBinding,
  getSkinFrames,
  resetSkinWeights,
} from '../../deformation/skinning'
import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetSceneNode,
  type PuppetSkinBinding,
} from '../../player'
import {isSceneNodeLocked} from './scene-graph'
import {updateNode} from './scene-tree'

/** Returns the part's owning rotation and its adjacent rotations through groups. */
export const getPartSkinTargets = (
  document: PuppetDocument,
  partId: string,
  mode: 'joint' | 'smooth' = 'joint',
): ReadonlyArray<string> => {
  const frames = getSkinFrames(getDocumentScene(document).roots)
  const parentRotation = (id: string) =>
    [...(frames.get(id)?.ancestors ?? [])]
      .reverse()
      .find((ancestor) => frames.get(ancestor)?.node.kind === 'deformer')
  const owner = parentRotation(partId)
  if (owner === undefined || frames.get(partId)?.node.kind !== 'part') {
    return []
  }
  if (mode === 'smooth') {
    const connected = new Set([owner])
    let previous = 0
    while (previous !== connected.size) {
      previous = connected.size
      for (const frame of frames.values()) {
        const parent = frame.node.kind === 'deformer' ? parentRotation(frame.node.id) : undefined
        if (parent !== undefined && (connected.has(parent) || connected.has(frame.node.id))) {
          connected.add(parent)
          connected.add(frame.node.id)
        }
      }
    }
    return [...connected]
  }
  const parent = parentRotation(owner)
  return [...frames.values()]
    .filter(
      (frame) =>
        frame.node.kind === 'deformer' &&
        (frame.node.id === owner ||
          frame.node.id === parent ||
          parentRotation(frame.node.id) === owner),
    )
    .map((frame) => frame.node.id)
}

export const setPartSkinning = (
  document: PuppetDocument,
  partId: string,
  skinning?: PuppetSkinBinding,
): PuppetDocument => {
  if (isSceneNodeLocked(document, partId)) {
    return document
  }
  const previousNode = getSkinFrames(getDocumentScene(document).roots).get(partId)?.node
  const wasSynced = previousNode?.kind === 'part' && previousNode.skinning?.syncSeams === true
  if (skinning !== undefined && (skinning.syncSeams === true || wasSynced)) {
    return synchronizeSkinSeams(document, partId, skinning)
  }
  const scene = getDocumentScene(document)
  return {
    ...document,
    scene: {
      ...scene,
      roots: updateNode(scene.roots, partId, (node) =>
        node.kind === 'part' ? {...node, skinning} : node,
      ),
    },
  }
}

const MINIMUM_SKIN_STRENGTH = 0.5

const changeSkinStrength = (
  binding: PuppetSkinBinding,
  target: number,
  value: number,
): PuppetSkinBinding => {
  const strength = MINIMUM_SKIN_STRENGTH + Math.max(0, Math.min(1, value))
  const ratio = strength / (binding.influences[target]?.strength ?? 1)
  const totals = (binding.influences[target]?.weights ?? []).map((_, vertex) =>
    binding.influences.reduce(
      (sum, influence, index) =>
        sum + (influence.weights[vertex] ?? 0) * (index === target ? ratio : 1),
      0,
    ),
  )
  return {
    ...binding,
    influences: binding.influences.map((influence, index) => ({
      ...influence,
      strength: index === target ? strength : influence.strength,
      weights: influence.weights.map(
        (weight, vertex) => (weight * (index === target ? ratio : 1)) / (totals[vertex] ?? 1),
      ),
    })),
  }
}

export const changeSkinWeight = (
  binding: PuppetSkinBinding,
  target: number,
  value: number,
  vertexIndex?: number,
): PuppetSkinBinding => {
  if (vertexIndex === undefined) {
    return changeSkinStrength(binding, target, value)
  }
  const weight = Math.max(0, Math.min(1, value))
  return {
    ...binding,
    influences: binding.influences.map((influence, index) => ({
      ...influence,
      weights: influence.weights.map((current, vertex) => {
        if (vertexIndex !== undefined && vertex !== vertexIndex) {
          return current
        }
        if (index === target) {
          return weight
        }
        const remainder = binding.influences.reduce(
          (sum, other, otherIndex) =>
            sum + (otherIndex === target ? 0 : (other.weights[vertex] ?? 0)),
          0,
        )
        return remainder > 0
          ? (current / remainder) * (1 - weight)
          : (1 - weight) / (binding.influences.length - 1)
      }),
    })),
  }
}

/** Removes bindings invalidated by topology edits or changes to the rotation hierarchy. */
export const reconcileSkinning = (
  previous: PuppetDocument,
  next: PuppetDocument,
): PuppetDocument => {
  const scene = getDocumentScene(next)
  const frames = getSkinFrames(scene.roots)
  let changed = false
  const visit = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<PuppetSceneNode> =>
    nodes.map((node) => {
      if (node.kind !== 'part') {
        return {...node, children: visit(node.children)}
      }
      const binding = node.skinning
      if (binding === undefined) {
        return node
      }
      const oldMesh = previous.parts.find((part) => part.id === node.id)?.mesh
      const mesh = next.parts.find((part) => part.id === node.id)?.mesh
      const topologyChanged =
        oldMesh !== undefined &&
        mesh !== undefined &&
        (oldMesh.vertices.length !== mesh.vertices.length ||
          oldMesh.indices.length !== mesh.indices.length ||
          oldMesh.indices.some((value, index) => value !== mesh.indices[index]))
      if (
        topologyChanged ||
        !frames.has(node.id) ||
        binding.influences.some((influence) => {
          const target = frames.get(influence.nodeId)?.node
          return (
            target?.kind !== 'deformer' ||
            target.deformerType !== 'rotation' ||
            influence.weights.length !== (mesh?.vertices.length ?? 0) / 2
          )
        })
      ) {
        changed = true
        return {...node, skinning: undefined}
      }
      return node
    })
  const roots = visit(scene.roots)
  return changed ? {...next, scene: {...scene, roots}} : next
}

export const configurePartSkinning = (
  document: PuppetDocument,
  partId: string,
  options: PuppetSkinOptions,
  nodeIds?: ReadonlyArray<string>,
): PuppetSkinBinding | undefined => {
  const {roots} = getDocumentScene(document)
  const node = getSkinFrames(roots).get(partId)?.node
  const current = node?.kind === 'part' ? node.skinning : undefined
  const part = document.parts.find((part) => part.id === partId)
  if (current === undefined || part === undefined) {
    return undefined
  }
  const created = createConfiguredSkinBinding({
    nodeIds: nodeIds ?? current.influences.map((influence) => influence.nodeId),
    nodes: roots,
    options,
    partId,
    vertices: part.mesh.vertices,
  })
  if (created === undefined) {
    return undefined
  }
  const seed = {
    ...created,
    ...options,
    bind: current.bind,
    influences: created.influences.map(
      (influence) => current.influences.find((old) => old.nodeId === influence.nodeId) ?? influence,
    ),
  }
  const scene = {
    ...getDocumentScene(document),
    roots: updateNode(roots, partId, (node) =>
      node.kind === 'part' ? {...node, skinning: seed} : node,
    ),
  }
  const result = resetSkinWeights(scene.roots, partId, part.mesh.vertices)
  return result === undefined ? undefined : {...result, syncSeams: current.syncSeams}
}

interface SkinSelectionOptions {
  readonly document: PuppetDocument
  readonly nodeIds: ReadonlyArray<string>
  readonly append?: boolean
}

export const connectSkinSelection = (input: SkinSelectionOptions): PuppetDocument => {
  const {document, nodeIds, append} = input
  const frames = getSkinFrames(getDocumentScene(document).roots)
  const rotations = nodeIds.filter((id) => {
    const node = frames.get(id)?.node
    return node?.kind === 'deformer' && node.deformerType === 'rotation'
  })
  if (rotations.length === 0) {
    return document
  }
  return nodeIds.reduce((result, partId) => {
    const node = frames.get(partId)?.node
    const part = document.parts.find((part) => part.id === partId)
    if (node?.kind !== 'part' || part === undefined || isSceneNodeLocked(document, partId)) {
      return result
    }
    const previous = node.skinning
    const targets = [
      ...new Set([
        ...(append ? (previous?.influences.map((item) => item.nodeId) ?? []) : []),
        ...rotations,
      ]),
    ]
    if (targets.length < 2) {
      return result
    }
    const options = {mode: previous?.mode ?? 'smooth', range: previous?.range ?? 1} as const
    const skinning =
      previous === undefined
        ? createConfiguredSkinBinding({
            nodeIds: targets,
            nodes: getDocumentScene(document).roots,
            options,
            partId,
            vertices: part.mesh.vertices,
          })
        : configurePartSkinning(document, partId, options, targets)
    return skinning === undefined ? result : setPartSkinning(result, partId, skinning)
  }, document)
}
