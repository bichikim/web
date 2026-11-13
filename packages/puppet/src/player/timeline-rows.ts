import {
  PUPPET_MODEL_TRACK_TARGETS,
  type PuppetDocument,
  type PuppetKeyframe,
  type PuppetModelTrackTarget,
  type PuppetParameter,
  type PuppetSceneGroupNode,
  type PuppetSceneNode,
  type PuppetTrack,
} from './document'

/**
 * 파라미터 행은 원본 ID를 유지한다. 효과 행의 화면용 ID는 문서의 파라미터 ID와 겹치지 않게
 * 만들며, 저장할 때는 `timelineEffectRows`의 종류와 대상 ID로 구분한다.
 */
const MODEL_ROW = 'model:'
const GROUP_OPACITY_ROW = 'group-opacity:'

/** 문서의 파라미터 ID와 겹치지 않는 화면용 효과 행 ID를 반환한다. */
const availableEffectId = (id: string, document?: PuppetDocument): string => {
  const occupied = new Set(document?.parameters?.map((parameter) => parameter.id))
  let candidate = id
  while (occupied.has(candidate)) {
    candidate = `effect:${candidate}`
  }
  return candidate
}

/** 문서를 생략하면 기존 모델 행 ID를 반환한다. 문서가 있으면 ID 충돌을 피한다. */
export const getModelTrackRowId = (target: PuppetModelTrackTarget, document?: PuppetDocument) =>
  availableEffectId(`${MODEL_ROW}${target}`, document)

/** 문서를 생략하면 기존 그룹 행 ID를 반환한다. 문서가 있으면 ID 충돌을 피한다. */
export const getGroupOpacityRowId = (groupId: string, document?: PuppetDocument) =>
  availableEffectId(`${GROUP_OPACITY_ROW}${groupId}`, document)

/** 트랙의 화면용 행 ID. 문서를 생략하면 기존 ID를 반환하며, 정점 트랙에는 행이 없다. */
export const getTrackRowId = (
  track: PuppetTrack,
  document?: PuppetDocument,
): string | undefined => {
  switch (track.kind) {
    case 'parameter':
      return track.parameterId
    case 'model':
      return getModelTrackRowId(track.target, document)
    case 'group-opacity':
      return getGroupOpacityRowId(track.groupId, document)
    case 'vertex':
      return undefined
    default: {
      const exhaustive: never = track
      return exhaustive
    }
  }
}

export const isTrackForRow = (track: PuppetTrack, rowId: string, document?: PuppetDocument) =>
  getTrackRowId(track, document) === rowId

const findModelTarget = (rowId: string, document?: PuppetDocument) =>
  PUPPET_MODEL_TRACK_TARGETS.find((target) => getModelTrackRowId(target, document) === rowId)

/** 그룹 효과 행의 대상 ID. 문서를 주면 충돌을 피한 화면용 ID도 해당 그룹에 대응시킨다. */
export const getRowGroupId = (rowId: string, document?: PuppetDocument) =>
  document === undefined
    ? rowId.startsWith(GROUP_OPACITY_ROW)
      ? rowId.slice(GROUP_OPACITY_ROW.length)
      : undefined
    : collectGroupIds(document.scene?.roots ?? []).find(
        (id) => getGroupOpacityRowId(id, document) === rowId,
      )

export const isModelRow = (rowId: string, document?: PuppetDocument) =>
  findModelTarget(rowId, document) !== undefined

/** 행의 종류에 맞는 트랙을 만든다. 문서를 생략하면 기존 효과 행 ID를 사용한다. */
export const createRowTrack = (
  rowId: string,
  keyframes: ReadonlyArray<PuppetKeyframe>,
  document?: PuppetDocument,
): PuppetTrack => {
  const target = findModelTarget(rowId, document)
  if (target !== undefined) {
    return {keyframes, kind: 'model', target}
  }
  const groupId = getRowGroupId(rowId, document)
  return groupId === undefined
    ? {keyframes, kind: 'parameter', parameterId: rowId}
    : {groupId, keyframes, kind: 'group-opacity'}
}

const MODEL_ROW_NAMES: Readonly<Record<PuppetModelTrackTarget, string>> = {
  'eye-blink': '눈 뜸(눈 깜빡임)',
  'lip-sync': '립싱크',
  opacity: '모델 불투명도',
}

const createEffectParameter = (id: string, name: string, defaultValue = 1): PuppetParameter => ({
  defaultValue,
  id,
  maximum: 1,
  minimum: 0,
  name,
})

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

/** 파라미터 행은 원래 범위를 유지하고, 효과 행은 0..1 범위의 편집용 정의를 반환한다. */
export const getRowParameter = (
  document: PuppetDocument,
  rowId: string,
): PuppetParameter | undefined => {
  const parameter = document.parameters?.find((candidate) => candidate.id === rowId)
  if (parameter !== undefined) {
    return parameter
  }
  const target = findModelTarget(rowId, document)
  if (target !== undefined) {
    return createEffectParameter(rowId, MODEL_ROW_NAMES[target], target === 'lip-sync' ? 0 : 1)
  }
  const groupId = getRowGroupId(rowId, document)
  if (groupId === undefined) {
    return undefined
  }
  const group = findGroup(document.scene?.roots ?? [], groupId)
  return group === undefined ? undefined : createEffectParameter(rowId, `${group.name} 불투명도`)
}

const collectGroups = (
  nodes: ReadonlyArray<PuppetSceneNode>,
): ReadonlyArray<PuppetSceneGroupNode> =>
  nodes.flatMap((node) =>
    node.kind === 'part'
      ? []
      : [...(node.kind === 'group' ? [node] : []), ...collectGroups(node.children)],
  )

/** IDs of every scene group, in depth-first document order. */
const collectGroupIds = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<string> =>
  collectGroups(nodes).map((group) => group.id)

const effectRowsByDocument = new WeakMap<PuppetDocument, ReadonlyArray<PuppetParameter>>()

/** Model rows, then one opacity row per scene group. */
export const getEffectRows = (document: PuppetDocument): ReadonlyArray<PuppetParameter> => {
  const cached = effectRowsByDocument.get(document)
  if (cached !== undefined) {
    return cached
  }
  const groups = collectGroups(document.scene?.roots ?? [])
  const names = new Map<string, string>()
  for (const group of groups) {
    if (!names.has(group.id)) {
      names.set(group.id, group.name)
    }
  }
  const rows = [
    ...PUPPET_MODEL_TRACK_TARGETS.map((target) =>
      createEffectParameter(
        getModelTrackRowId(target, document),
        MODEL_ROW_NAMES[target],
        target === 'lip-sync' ? 0 : 1,
      ),
    ),
    ...groups.map((group) =>
      createEffectParameter(
        getGroupOpacityRowId(group.id, document),
        `${names.get(group.id)} 불투명도`,
      ),
    ),
  ]
  effectRowsByDocument.set(document, rows)
  return rows
}
