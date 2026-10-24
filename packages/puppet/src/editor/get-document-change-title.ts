import {isEqual} from 'es-toolkit'
import {
  getDeformerRenderProperties,
  getGroupRenderProperties,
  type ResolvedGroupRenderProperties,
} from '../deformation/group-properties'
import {getPartRenderProperties} from '../deformation/part-properties'
import {
  getDocumentScene,
  isSceneContainerNode,
  type PuppetDeformerRenderProperties,
  type PuppetDocument,
  type PuppetParameterBinding,
  type PuppetParameterDeformerKeyform,
  type PuppetParameterGroupKeyform,
  type PuppetParameterPartKeyform,
  type PuppetPart,
  type PuppetPartRenderProperties,
  type PuppetSceneDeformerNode,
  type PuppetSceneNode,
} from '../player'

interface ChangeField<Value> {
  readonly key: keyof Value
  readonly title: string
}

interface TargetChange {
  readonly id: string
  readonly details: ReadonlyArray<string>
}

const RENDER_FIELDS: ReadonlyArray<ChangeField<PuppetPartRenderProperties>> = [
  {key: 'opacity', title: '불투명도 변경'},
  {key: 'blendMode', title: '블렌드 모드 변경'},
  {key: 'alphaBlendMode', title: '알파 합성 변경'},
  {key: 'culling', title: '컬링 변경'},
  {key: 'multiplyColor', title: '곱하기 색상 변경'},
  {key: 'screenColor', title: '스크린 색상 변경'},
  {key: 'clippingMaskIds', title: '마스크 적용 대상 변경'},
  {key: 'invertedMask', title: '마스크 반전 변경'},
  {key: 'renderWhenUsedAsMask', title: '마스크 사용 시 파츠 표시 변경'},
]

const GROUP_FIELDS: ReadonlyArray<ChangeField<ResolvedGroupRenderProperties>> = [
  {key: 'offscreen', title: '오프스크린 합성 변경'},
  {key: 'opacity', title: '불투명도 변경'},
  {key: 'blendMode', title: '블렌드 모드 변경'},
  {key: 'alphaBlendMode', title: '알파 합성 변경'},
  {key: 'multiplyColor', title: '곱하기 색상 변경'},
  {key: 'screenColor', title: '스크린 색상 변경'},
  {key: 'clippingMaskIds', title: '클리핑 마스크 변경'},
  {key: 'invertedMask', title: '마스크 반전 변경'},
]

const COLOR_FIELDS: ReadonlyArray<ChangeField<PuppetDeformerRenderProperties>> = [
  {key: 'opacity', title: '불투명도 변경'},
  {key: 'multiplyColor', title: '곱하기 색상 변경'},
  {key: 'screenColor', title: '스크린 색상 변경'},
]

const DRAW_ORDER_TITLE = '그리기 순서 변경'

const KEYED_GROUP_FIELDS: ReadonlyArray<ChangeField<PuppetParameterGroupKeyform['properties']>> = [
  ...COLOR_FIELDS,
  {key: 'drawOrder', title: DRAW_ORDER_TITLE},
]

const NODE_FIELDS: ReadonlyArray<ChangeField<PuppetSceneNode>> = [
  {key: 'name', title: '이름 변경'},
  {key: 'visible', title: '표시 변경'},
  {key: 'locked', title: '잠금 변경'},
]

const POSE_FIELDS = [
  {key: 'controlPoints', title: '제어점 편집'},
  {key: 'curveHandles', title: '곡률 핸들 변경'},
  {key: 'rotationOrigin', title: '회전 중심 변경'},
  {key: 'spatialOrigin', title: '3D 변형 중심 변경'},
  {key: 'spatialMeshPosition', title: '3D 메시 위치 변경'},
  {key: 'spatialRotation', title: '3D 회전 변경'},
  {key: 'spatialScale', title: '3D 크기 변경'},
  {key: 'spatialTranslation', title: '3D 이동 변경'},
] as const satisfies ReadonlyArray<ChangeField<PuppetParameterDeformerKeyform>>

const DEFORMER_FIELDS: ReadonlyArray<ChangeField<PuppetSceneDeformerNode>> = [
  ...POSE_FIELDS,
  {key: 'columns', title: '격자 열 수 변경'},
  {key: 'rows', title: '격자 행 수 변경'},
  {key: 'bounds', title: '변형 범위 변경'},
  {key: 'pins', title: '핀 편집'},
  {key: 'boneRestPoints', title: '본 기준 형태 변경'},
  {key: 'boneWeights', title: '본 가중치 변경'},
  {key: 'vertexInfluences', title: '정점 영향도 변경'},
  {key: 'spatialMesh', title: '입체 메시 편집'},
]

const getChangedFields = <Value>(
  before: Value,
  after: Value,
  fields: ReadonlyArray<ChangeField<Value>>,
) => fields.filter(({key}) => !isEqual(before[key], after[key])).map(({title}) => title)

/**
 * The draw order title when the stored draw orders differ. Omission is compared as its own value
 * because a group without one passes its descendants' draw orders through.
 */
const getDrawOrderChange = (
  before: {readonly drawOrder?: number} | undefined,
  after: {readonly drawOrder?: number} | undefined,
) => (before?.drawOrder === after?.drawOrder ? [] : [DRAW_ORDER_TITLE])

const getNodes = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<PuppetSceneNode> =>
  nodes.flatMap((node) => [node, ...(isSceneContainerNode(node) ? getNodes(node.children) : [])])

const formatChanges = (document: PuppetDocument, changes: ReadonlyArray<TargetChange>) => {
  const changed = changes.filter(({details}) => details.length > 0)
  if (changed.length === 0) {
    return undefined
  }
  const names = new Map(
    getNodes(getDocumentScene(document).roots).map((node) => [node.id, node.name]),
  )
  const ids = [...new Set(changed.map(({id}) => id))]
  const first = names.get(ids[0]!)?.trim() || ids[0]!
  const target = ids.length === 1 ? first : `${first} 외 ${ids.length - 1}개`
  const details = [...new Set(changed.flatMap((change) => change.details))]
  return `${target} · ${details.join(', ')}`
}

const getParameterTitle = (before: PuppetDocument, after: PuppetDocument) => {
  const previous = before.parameters ?? []
  const next = after.parameters ?? []
  if (next.length !== previous.length) {
    return next.length > previous.length ? '파라미터 추가' : '파라미터 삭제'
  }
  if (next.some((parameter, index) => parameter.name !== previous[index]?.name)) {
    return '파라미터 이름 변경'
  }
  return before.parameters === after.parameters ? undefined : '파라미터 설정 변경'
}

const getPartTitle = (before: PuppetDocument, after: PuppetDocument) => {
  if (before.parts.length !== after.parts.length) {
    return after.parts.length > before.parts.length ? '파츠 추가' : '파츠 삭제'
  }
  const previous = new Map(before.parts.map((part) => [part.id, part]))
  return formatChanges(
    after,
    after.parts.flatMap((part) => {
      const previousPart = previous.get(part.id)
      return previousPart === undefined || part === previousPart
        ? []
        : [{details: getPartDetails(previousPart, part), id: part.id}]
    }),
  )
}

const getPartDetails = (before: PuppetPart, after: PuppetPart) => [
  ...(isEqual(before.mesh, after.mesh) ? [] : ['메시 편집']),
  ...(isEqual(before.texture, after.texture) ? [] : ['텍스처 변경']),
  ...(isEqual(before.spatial, after.spatial) ? [] : ['입체 메시 편집']),
  ...getChangedFields(
    getPartRenderProperties(before),
    getPartRenderProperties(after),
    RENDER_FIELDS,
  ),
  ...getDrawOrderChange(before.properties, after.properties),
]

const getNodeDetails = (before: PuppetSceneNode, after: PuppetSceneNode) => [
  ...getChangedFields(before, after, NODE_FIELDS),
  ...(before.kind === 'deformer' && after.kind === 'deformer'
    ? [
        ...getChangedFields(before, after, DEFORMER_FIELDS),
        ...getChangedFields(
          getDeformerRenderProperties(before),
          getDeformerRenderProperties(after),
          COLOR_FIELDS,
        ),
      ]
    : []),
  ...(before.kind === 'group' && after.kind === 'group'
    ? [
        ...getChangedFields(
          getGroupRenderProperties(before),
          getGroupRenderProperties(after),
          GROUP_FIELDS,
        ),
        ...getDrawOrderChange(before.properties, after.properties),
      ]
    : []),
  ...(before.kind === 'part' && after.kind === 'part' && !isEqual(before.skinning, after.skinning)
    ? ['스키닝 변경']
    : []),
]

const getSceneTitle = (before: PuppetDocument, after: PuppetDocument) => {
  if (before.scene === after.scene) {
    return undefined
  }
  const previous = getNodes(getDocumentScene(before).roots)
  const next = getNodes(getDocumentScene(after).roots)
  if (next.length !== previous.length) {
    return next.length > previous.length ? '레이어 추가' : '레이어 삭제'
  }
  const previousNodes = new Map(previous.map((node) => [node.id, node]))
  return (
    formatChanges(
      after,
      next.flatMap((node) => {
        const previousNode = previousNodes.get(node.id)
        return previousNode === undefined || node === previousNode
          ? []
          : [{details: getNodeDetails(previousNode, node), id: node.id}]
      }),
    ) ?? '레이어·디포머 편집'
  )
}

const getKeyformPartDetails = (
  rest: PuppetPart,
  before: PuppetParameterPartKeyform,
  after: PuppetParameterPartKeyform,
) => [
  ...(isEqual(before.vertices, after.vertices) ? [] : ['메시 편집']),
  ...getChangedFields(
    getPartRenderProperties({...rest, properties: {...rest.properties, ...before.properties}}),
    getPartRenderProperties({...rest, properties: {...rest.properties, ...after.properties}}),
    RENDER_FIELDS,
  ),
  ...getDrawOrderChange(before.properties, after.properties),
  ...(isEqual(before.glue, after.glue) ? [] : ['글루 편집']),
]

const getKeyformDeformerDetails = (
  before: PuppetParameterDeformerKeyform,
  after: PuppetParameterDeformerKeyform,
) => [
  ...getChangedFields(before, after, POSE_FIELDS),
  ...(before.rotationScale === after.rotationScale ? [] : ['배율 변경']),
  ...getChangedFields(before.properties ?? {}, after.properties ?? {}, COLOR_FIELDS),
]

const getKeyformChanges = (
  document: PuppetDocument,
  before: PuppetParameterBinding,
  after: PuppetParameterBinding,
): ReadonlyArray<TargetChange> => {
  const keyforms = new Map(before.keyforms.map((keyform) => [keyform.values.join(','), keyform]))
  const parts = new Map(document.parts.map((part) => [part.id, part]))
  return after.keyforms.flatMap((keyform) => {
    const previous = keyforms.get(keyform.values.join(','))
    if (previous === undefined || previous === keyform) {
      return []
    }
    const previousParts = new Map(previous.parts.map((part) => [part.partId, part]))
    const previousDeformers = new Map(previous.deformers?.map((node) => [node.nodeId, node]))
    const previousGroups = new Map(previous.groups?.map((group) => [group.groupId, group]))
    return [
      ...keyform.parts.flatMap((part) => {
        const previousPart = previousParts.get(part.partId)
        const rest = parts.get(part.partId)
        if (previousPart === undefined || rest === undefined || part === previousPart) {
          return []
        }
        return [{details: getKeyformPartDetails(rest, previousPart, part), id: part.partId}]
      }),
      ...(keyform.deformers ?? []).flatMap((node) => {
        const previousNode = previousDeformers.get(node.nodeId)
        return previousNode === undefined || node === previousNode
          ? []
          : [{details: getKeyformDeformerDetails(previousNode, node), id: node.nodeId}]
      }),
      ...(keyform.groups ?? []).flatMap((group) => {
        const previousGroup = previousGroups.get(group.groupId)
        return previousGroup === undefined || group === previousGroup
          ? []
          : [
              {
                details: getChangedFields(
                  previousGroup.properties,
                  group.properties,
                  KEYED_GROUP_FIELDS,
                ),
                id: group.groupId,
              },
            ]
      }),
    ]
  })
}

const getKeyformTitle = (before: PuppetDocument, after: PuppetDocument) => {
  const previous = new Map(before.parameterBindings?.map((binding) => [binding.id, binding]))
  const changes = (after.parameterBindings ?? []).flatMap((binding) => {
    const previousBinding = previous.get(binding.id)
    return previousBinding === undefined || binding === previousBinding
      ? []
      : getKeyformChanges(after, previousBinding, binding)
  })
  const title = formatChanges(after, changes)
  return title === undefined ? '키폼 편집' : `${title} (키폼)`
}

const getMotionTitle = (before: PuppetDocument, after: PuppetDocument) => {
  if (before.motions === after.motions) {
    return undefined
  }
  if (before.motions.length !== after.motions.length) {
    return after.motions.length > before.motions.length ? '모션 추가' : '모션 삭제'
  }
  return '모션·키프레임 편집'
}

const getSettingsTitle = (before: PuppetDocument, after: PuppetDocument) => {
  if (before.parameterBindings !== after.parameterBindings) {
    return getKeyformTitle(before, after)
  }
  if (before.glue !== after.glue) {
    return '글루 편집'
  }
  if (before.physics !== after.physics) {
    return '물리 설정 변경'
  }
  if (before.layerOrderRules !== after.layerOrderRules) {
    return '레이어 순서 규칙 변경'
  }
  if (before.expressions !== after.expressions) {
    return '표정 편집'
  }
  if (before.poseGroups !== after.poseGroups) {
    return '포즈 편집'
  }
  if (before.hitAreas !== after.hitAreas) {
    return '히트 영역 편집'
  }
  if (before.breath !== after.breath) {
    return '자동 호흡 편집'
  }
  if (before.look !== after.look) {
    return '시선 따라가기 편집'
  }
  if (before.mouthShapes !== after.mouthShapes) {
    return '입 모양 편집'
  }
  if (before.parameterRoles !== after.parameterRoles) {
    return '파라미터 역할 변경'
  }
  if (before.parameterGroups !== after.parameterGroups) {
    return '파라미터 그룹 편집'
  }
  if (before.framesPerSecond !== after.framesPerSecond) {
    return '프레임 속도 변경'
  }
  if (before.viewport !== after.viewport) {
    return '캔버스 크기 변경'
  }
  if (before.layout !== after.layout) {
    return '기본 화면 변경'
  }
  return undefined
}

export const getDocumentChangeTitle = (before: PuppetDocument, after: PuppetDocument): string =>
  getParameterTitle(before, after) ??
  getPartTitle(before, after) ??
  getSceneTitle(before, after) ??
  getMotionTitle(before, after) ??
  getSettingsTitle(before, after) ??
  '문서 편집'
