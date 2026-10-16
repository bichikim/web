import {
  PUPPET_MODEL_TRACK_TARGETS,
  type PuppetDocument,
  type PuppetKeyframe,
  type PuppetModelTrackTarget,
  type PuppetParameter,
  type PuppetSceneNode,
  type PuppetTrack,
} from './document'

/**
 * Timeline rows (`timelineParameterIds`) name a parameter, `model:<target>` for a model track,
 * or `group-opacity:<groupId>` for a scene group's opacity track.
 */
const MODEL_ROW = 'model:'
const GROUP_OPACITY_ROW = 'group-opacity:'

export const getModelTrackRowId = (target: PuppetModelTrackTarget) => `${MODEL_ROW}${target}`
export const getGroupOpacityRowId = (groupId: string) => `${GROUP_OPACITY_ROW}${groupId}`

/** The timeline row a track belongs to; vertex tracks have none. */
export const getTrackRowId = (track: PuppetTrack): string | undefined => {
  switch (track.kind) {
    case 'parameter':
      return track.parameterId
    case 'model':
      return getModelTrackRowId(track.target)
    case 'group-opacity':
      return getGroupOpacityRowId(track.groupId)
    case 'vertex':
      return undefined
    default: {
      const exhaustive: never = track
      return exhaustive
    }
  }
}

export const isTrackForRow = (track: PuppetTrack, rowId: string) => getTrackRowId(track) === rowId

const findModelTarget = (rowId: string) =>
  PUPPET_MODEL_TRACK_TARGETS.find((target) => getModelTrackRowId(target) === rowId)

/** The group of a `group-opacity:` row. */
export const getRowGroupId = (rowId: string) =>
  rowId.startsWith(GROUP_OPACITY_ROW) ? rowId.slice(GROUP_OPACITY_ROW.length) : undefined

export const isModelRow = (rowId: string) => findModelTarget(rowId) !== undefined

/** A track for `rowId` holding `keyframes`. */
export const createRowTrack = (
  rowId: string,
  keyframes: ReadonlyArray<PuppetKeyframe>,
): PuppetTrack => {
  const target = findModelTarget(rowId)
  if (target !== undefined) {
    return {keyframes, kind: 'model', target}
  }
  const groupId = getRowGroupId(rowId)
  return groupId === undefined
    ? {keyframes, kind: 'parameter', parameterId: rowId}
    : {groupId, keyframes, kind: 'group-opacity'}
}

const MODEL_ROW_NAMES: Readonly<Record<PuppetModelTrackTarget, string>> = {
  'eye-blink': '눈 뜸(눈 깜빡임)',
  'lip-sync': '립싱크',
  opacity: '모델 불투명도',
}

const findGroup = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  id: string,
): PuppetSceneNode | undefined =>
  nodes.reduce<PuppetSceneNode | undefined>(
    (found, node) =>
      found ??
      (node.id === id && node.kind === 'group'
        ? node
        : node.kind === 'part'
          ? undefined
          : findGroup(node.children, id)),
    undefined,
  )

/**
 * The row's value range as a parameter: the parameter itself, or a 0..1 definition for model
 * opacity, eye openness and group opacity (default 1) and lip sync (default 0).
 */
export const getRowParameter = (
  document: PuppetDocument,
  rowId: string,
): PuppetParameter | undefined => {
  const target = findModelTarget(rowId)
  if (target !== undefined) {
    return {
      defaultValue: target === 'lip-sync' ? 0 : 1,
      id: rowId,
      maximum: 1,
      minimum: 0,
      name: MODEL_ROW_NAMES[target],
    }
  }
  const groupId = getRowGroupId(rowId)
  if (groupId === undefined) {
    return document.parameters?.find((parameter) => parameter.id === rowId)
  }
  const group = findGroup(document.scene?.roots ?? [], groupId)
  return group === undefined
    ? undefined
    : {defaultValue: 1, id: rowId, maximum: 1, minimum: 0, name: `${group.name} 불투명도`}
}

/** Model rows, then one opacity row per scene group. */
const collectGroupIds = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<string> =>
  nodes.flatMap((node) =>
    node.kind === 'part'
      ? []
      : [...(node.kind === 'group' ? [node.id] : []), ...collectGroupIds(node.children)],
  )

export const getEffectRows = (document: PuppetDocument): ReadonlyArray<PuppetParameter> =>
  [
    ...PUPPET_MODEL_TRACK_TARGETS.map(getModelTrackRowId),
    ...collectGroupIds(document.scene?.roots ?? []).map(getGroupOpacityRowId),
  ].flatMap((rowId) => {
    const parameter = getRowParameter(document, rowId)
    return parameter === undefined ? [] : [parameter]
  })
