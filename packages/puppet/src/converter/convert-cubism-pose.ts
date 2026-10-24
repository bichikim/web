import {
  DEFAULT_PUPPET_POSE_FADE_TIME,
  type PuppetDocument,
  type PuppetParameter,
  type PuppetPoseGroup,
  type PuppetSceneNode,
} from '../player/document'
import {jsonArray, jsonNumber, jsonObject, jsonString} from './json-fields'

export interface CubismPose {
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly poseGroups: ReadonlyArray<PuppetPoseGroup>
}

const partIds = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<string> =>
  nodes.flatMap((node) => (node.kind === 'part' ? [node.id] : partIds(node.children)))

/** Cubism 포즈의 파츠 선택 입력과 링크를 Poffo 포즈 그룹으로 변환한다. */
export const convertCubismPose = (value: unknown, document: PuppetDocument): CubismPose => {
  const source = jsonObject(value)
  const groups = new Map<string, ReadonlyArray<string>>()
  const visit = (nodes: ReadonlyArray<PuppetSceneNode>) => {
    for (const node of nodes) {
      if (node.kind !== 'part') {
        if (node.kind === 'group') {
          groups.set(node.id, partIds(node.children))
        }
        visit(node.children)
      }
    }
  }
  visit(document.scene?.roots ?? [])
  const parameters = new Map(
    (document.parameters ?? []).map((parameter) => [parameter.id, parameter]),
  )
  const poseGroups = jsonArray(source.Groups).map((value, index): PuppetPoseGroup => {
    const entries = jsonArray(value).map(jsonObject)
    const id = `cubism:pose:${index}`
    if (parameters.has(id)) {
      throw new Error(`Cubism pose ID conflicts with a model parameter: ${id}`)
    }
    parameters.set(id, {
      defaultValue: 0,
      id,
      maximum: Math.max(1, entries.length - 1),
      minimum: 0,
      name: `Pose ${index + 1}`,
    })
    const sourceParameterIds = entries.map((entry, entryIndex) => {
      const parameterId = jsonString(entry.Id)
      if (!parameters.has(parameterId)) {
        parameters.set(parameterId, {
          defaultValue: entryIndex === 0 ? 1 : 0,
          id: parameterId,
          maximum: 1,
          minimum: 0,
          name: parameterId,
        })
      }
      return parameterId
    })
    return {
      entries: entries.map((entry, entryIndex) => ({
        partIds: [jsonString(entry.Id), ...jsonArray(entry.Link ?? []).map(jsonString)].flatMap(
          (groupId) => {
            const members = groups.get(groupId)
            if (members === undefined || members.length === 0) {
              throw new Error(`Cubism pose group is missing: ${groupId}`)
            }
            return members
          },
        ),
        value: entryIndex,
      })),
      fadeTime: jsonNumber(source.FadeInTime, DEFAULT_PUPPET_POSE_FADE_TIME),
      id,
      parameterId: id,
      sourceParameterIds,
    }
  })
  return {parameters: [...parameters.values()], poseGroups}
}
