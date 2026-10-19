import {
  getDocumentScene,
  isSceneContainerNode,
  parseDocumentValue,
  type PuppetDocument,
  type PuppetKeyframe,
  type PuppetSceneNode,
  type PuppetTrack,
} from '../../player'
import {sampleKeyframes} from '../../player/internal/motion'
import {getSceneGroupIds} from '../../player/internal/scene-groups'
import {getRowGroupId, isModelRow} from '../../player/timeline-rows'
import {collectDocumentIds, mapDocumentReferences} from './document-references'
import {
  collectNodeIds,
  collectPartIds,
  findNode,
  findParentId,
  updateChildren,
  updateNode,
} from './scene-tree'
import {isSceneNodeLocked} from './scene-graph'
import {reconcileSpatialGroups} from './reconcile-spatial-groups'

const getSelectionRoots = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  ids: ReadonlySet<string>,
): ReadonlyArray<PuppetSceneNode> =>
  nodes.flatMap((node) =>
    ids.has(node.id)
      ? [node]
      : isSceneContainerNode(node)
        ? getSelectionRoots(node.children, ids)
        : [],
  )

const getSelectionIds = (document: PuppetDocument, nodeIds: ReadonlyArray<string>) => {
  const roots = getSelectionRoots(getDocumentScene(document).roots, new Set(nodeIds))
  const ids = new Set<string>()
  collectNodeIds(roots, ids)
  const parts = new Set<string>()
  roots.forEach((node) => collectPartIds(node, parts))
  return {ids, parts, roots}
}

/**
 * The copied `node` with the source's skinning and group render properties, whose references
 * outside the selection the copy keeps; pasting drops the ones the target document lacks.
 */
const restoreSourceReferences = (
  node: PuppetSceneNode,
  source: PuppetSceneNode | undefined,
): PuppetSceneNode => {
  switch (node.kind) {
    case 'part':
      return source?.kind === 'part' ? {...node, skinning: source.skinning} : node
    case 'group':
      return source?.kind === 'group' ? {...node, properties: source.properties} : node
    case 'deformer':
      return node
    default: {
      const exhaustive: never = node
      return exhaustive
    }
  }
}

/** Whether `track` animates a layer itself rather than a parameter or the model. */
const isLayerTrack = (track: PuppetTrack) =>
  track.kind === 'vertex' || track.kind === 'group-opacity'

/**
 * `keyframes` cut at `duration`: later keyframes are dropped and, unless one already sits at
 * the cut, a keyframe sampled there ends the curve with the value it had at that time. Linear
 * and stepped segments keep their shape; other easings span the shortened segment instead.
 */
const cutKeyframes = (keyframes: ReadonlyArray<PuppetKeyframe>, duration: number) => {
  const kept = keyframes.filter((keyframe) => keyframe.time <= duration)
  return kept.length === keyframes.length || kept.at(-1)?.time === duration
    ? kept
    : [...kept, {time: duration, value: sampleKeyframes(keyframes, duration)}]
}

/**
 * The layer tracks of a copied motion that fit into a motion of `duration` seconds (the copy
 * may come from a longer motion); tracks without keyframes are dropped.
 */
const fitLayerTracks = (tracks: ReadonlyArray<PuppetTrack>, duration: number) =>
  tracks.filter(isLayerTrack).flatMap((track) => {
    const keyframes = cutKeyframes(track.keyframes, duration)
    return keyframes.length === 0 ? [] : [{...track, keyframes}]
  })

/** Captures selected subtrees and their animation and parameter data. */
export const createLayerFragment = (
  document: PuppetDocument,
  nodeIds: ReadonlyArray<string>,
): PuppetDocument | undefined => {
  const selection = getSelectionIds(document, nodeIds)
  if (selection.roots.length === 0) {
    return undefined
  }
  const mapped = mapDocumentReferences({
    document: {...document, scene: {roots: selection.roots}},
    keepNode: (id) => selection.ids.has(id),
    keepPart: (id) => selection.parts.has(id),
    rename: (id) => id,
  })
  const sourceScene = getDocumentScene(document)
  const roots = [...selection.ids].reduce(
    (nodes, id) =>
      updateNode(nodes, id, (node) =>
        restoreSourceReferences(node, findNode(sourceScene.roots, id)),
      ),
    getDocumentScene(mapped).roots,
  )
  const parameterBindings = mapped.parameterBindings?.filter((binding) =>
    binding.keyforms.some(
      (form) =>
        form.parts.length > 0 ||
        (form.deformers?.length ?? 0) > 0 ||
        (form.groups?.length ?? 0) > 0,
    ),
  )
  const parameterIds = new Set([
    ...(parameterBindings ?? []).flatMap((binding) => [
      ...binding.parameterIds,
      ...(binding.influences ?? []).map((influence) => influence.parameterId),
    ]),
    ...(mapped.layerOrderRules ?? []).flatMap((rule) => rule.when.parameterIds),
  ])
  const groupIds = getSceneGroupIds({roots})
  // Group opacity follows its copied group; model-wide curves stay with the source model.
  const keepTrack = (track: PuppetTrack) =>
    track.kind === 'vertex' ||
    (track.kind === 'parameter' && parameterIds.has(track.parameterId)) ||
    (track.kind === 'group-opacity' && groupIds.has(track.groupId))
  const keepRow = (id: string) => {
    const groupId = getRowGroupId(id)
    return groupId === undefined ? !isModelRow(id) && parameterIds.has(id) : groupIds.has(groupId)
  }
  return {
    ...mapped,
    motions: mapped.motions
      .map((motion) => ({
        ...motion,
        timelineParameterIds: motion.timelineParameterIds?.filter(keepRow),
        tracks: motion.tracks.filter(keepTrack),
      }))
      .filter((motion) => motion.tracks.length > 0),
    parameterBindings,
    parameters: mapped.parameters?.filter((parameter) => parameterIds.has(parameter.id)),
    parts: mapped.parts.map((part) => ({
      ...part,
      properties: document.parts.find((source) => source.id === part.id)?.properties,
    })),
    physics: undefined,
    scene: {roots},
  }
}

/** Returns whether every selected subtree can be removed. */
export const canRemoveLayerNodes = (
  document: PuppetDocument,
  nodeIds: ReadonlyArray<string>,
): boolean => {
  const selection = getSelectionIds(document, nodeIds)
  return (
    selection.roots.length > 0 && [...selection.ids].every((id) => !isSceneNodeLocked(document, id))
  )
}

/** Removes selected subtrees and references to their nodes and parts. */
export const removeLayerNodes = (
  document: PuppetDocument,
  nodeIds: ReadonlyArray<string>,
): PuppetDocument | undefined => {
  const selection = getSelectionIds(document, nodeIds)
  if (
    selection.roots.length === 0 ||
    [...selection.ids].some((id) => isSceneNodeLocked(document, id))
  ) {
    return undefined
  }
  const result = parseDocumentValue(
    mapDocumentReferences({
      document,
      keepNode: (id) => !selection.ids.has(id),
      keepPart: (id) => !selection.parts.has(id),
      rename: (id) => id,
    }),
  )
  return result.ok ? result.document : undefined
}

interface PasteLayerResult {
  readonly document: PuppetDocument
  readonly nodeIds: ReadonlyArray<string>
}

/** Inserts a clipboard snapshot beside a target with distinct node and binding identifiers. */
export const pasteLayerFragment = (
  document: PuppetDocument,
  fragment: PuppetDocument,
  targetId: string | null,
): PasteLayerResult | undefined => {
  const scene = getDocumentScene(document)
  const parentId = targetId === null ? null : findParentId(scene.roots, targetId)
  if (parentId === undefined || (targetId !== null && isSceneNodeLocked(document, targetId))) {
    return undefined
  }
  const occupied = collectDocumentIds(document)
  const ids = new Set<string>()
  collectNodeIds(getDocumentScene(fragment).roots, ids)
  fragment.glue?.forEach((glue) => ids.add(glue.id))
  fragment.parameterBindings?.forEach((binding) => ids.add(binding.id))
  let index = 1
  while ([...ids].some((id) => occupied.has(`copy-${index}:${id}`))) {
    index += 1
  }
  const available = new Set([...occupied, ...ids])
  const added = mapDocumentReferences({
    document: fragment,
    keepNode: (id) => available.has(id),
    keepPart: (id) => available.has(id),
    rename: (id) => (ids.has(id) ? `copy-${index}:${id}` : id),
  })
  const {roots} = getDocumentScene(added)
  const nextScene = updateChildren(scene, parentId, (children) =>
    targetId === null
      ? [...children, ...roots]
      : children.flatMap((node) => (node.id === targetId ? [node, ...roots] : [node])),
  )
  if (nextScene === undefined) {
    return undefined
  }
  // A motion the document already has gains the copied layers' own curves and rows; its
  // parameter curves stay the document's.
  const motions = document.motions.map((motion) => {
    const copied = added.motions.find((candidate) => candidate.id === motion.id)
    if (copied === undefined) {
      return motion
    }
    const rows = (copied.timelineParameterIds ?? []).filter((id) => getRowGroupId(id) !== undefined)
    return {
      ...motion,
      timelineParameterIds:
        rows.length === 0
          ? motion.timelineParameterIds
          : [...(motion.timelineParameterIds ?? []), ...rows],
      tracks: [...motion.tracks, ...fitLayerTracks(copied.tracks, motion.duration)],
    }
  })
  const result = parseDocumentValue(
    reconcileSpatialGroups(
      {
        ...document,
        glue: [...(document.glue ?? []), ...(added.glue ?? [])],
        layerOrderRules: [...(document.layerOrderRules ?? []), ...(added.layerOrderRules ?? [])],
        motions: [
          ...motions,
          ...added.motions.filter(
            (motion) => !document.motions.some((candidate) => candidate.id === motion.id),
          ),
        ],
        parameterBindings: [
          ...(document.parameterBindings ?? []),
          ...(added.parameterBindings ?? []),
        ],
        parameters: [
          ...(document.parameters ?? []),
          ...(added.parameters ?? []).filter(
            (parameter) => !document.parameters?.some((candidate) => candidate.id === parameter.id),
          ),
        ],
        parts: [...document.parts, ...added.parts],
        scene: nextScene,
      },
      scene,
    ),
  )
  return result.ok ? {document: result.document, nodeIds: roots.map((node) => node.id)} : undefined
}
