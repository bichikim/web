import type {PuppetDocument, PuppetPoseGroup} from '../../player/document'
import {hasValidPoseGroups} from '../../player/internal/parse-pose'
import {acceptName, createUniqueName} from './preset-ids'

const POSE_GROUP_NAME = '포즈'

const getPoseGroups = (document: PuppetDocument) => document.poseGroups ?? []

const withPoseGroups = (
  document: PuppetDocument,
  poseGroups: ReadonlyArray<PuppetPoseGroup>,
): PuppetDocument | undefined => {
  const kept = poseGroups
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => entry.partIds.length > 0),
    }))
    .filter((group) => group.entries.length > 0)
  return hasValidPoseGroups(kept, document.parts, document.parameters ?? [])
    ? {...document, poseGroups: kept.length === 0 ? undefined : kept}
    : undefined
}

const releasePart = (document: PuppetDocument, partId: string) =>
  getPoseGroups(document).map((group) => ({
    ...group,
    entries: group.entries.map((entry) => ({
      ...entry,
      partIds: entry.partIds.filter((id) => id !== partId),
    })),
  }))

/** The pose group and entry showing `partId`, if any. */
export const getPartPose = (document: PuppetDocument, partId: string) =>
  getPoseGroups(document).flatMap((group) => {
    const entry = group.entries.find((candidate) => candidate.partIds.includes(partId))
    return entry === undefined ? [] : [{entry, group}]
  })[0]

/**
 * Shows `partId` for selector `value` in group `groupId`, joining the entry with that value or
 * adding one; `undefined` removes the part from every group. Empty entries and groups are dropped.
 */
export const setPartPose = (
  document: PuppetDocument,
  partId: string,
  target: {readonly groupId: string; readonly value: number} | undefined,
) => {
  const released = releasePart(document, partId)
  if (target === undefined) {
    return withPoseGroups(document, released)
  }
  return withPoseGroups(
    document,
    released.map((group) => {
      if (group.id !== target.groupId) {
        return group
      }
      const joined = group.entries.some((entry) => entry.value === target.value)
      return {
        ...group,
        entries: joined
          ? group.entries.map((entry) =>
              entry.value === target.value
                ? {...entry, partIds: [...entry.partIds, partId]}
                : entry,
            )
          : [...group.entries, {partIds: [partId], value: target.value}],
      }
    }),
  )
}

/** Creates a group selected by `parameterId` that shows `partId` at the parameter's default. */
export const addPartPoseGroup = (document: PuppetDocument, partId: string, parameterId: string) => {
  const parameter = document.parameters?.find((candidate) => candidate.id === parameterId)
  if (parameter === undefined) {
    return undefined
  }
  const id = createUniqueName(
    POSE_GROUP_NAME,
    getPoseGroups(document).map((group) => group.id),
  )
  const next = withPoseGroups(document, [
    ...releasePart(document, partId),
    {entries: [{partIds: [partId], value: parameter.defaultValue}], id, parameterId},
  ])
  return next === undefined ? undefined : {document: next, id}
}

/** Updates a group's selector parameter, fade time or name (empty or duplicate names are rejected). */
export const updatePoseGroup = (
  document: PuppetDocument,
  groupId: string,
  changes: Partial<Pick<PuppetPoseGroup, 'fadeTime' | 'id' | 'parameterId'>>,
) => {
  const id =
    changes.id === undefined
      ? groupId
      : acceptName(
          changes.id,
          groupId,
          getPoseGroups(document).map((group) => group.id),
        )
  return id === undefined
    ? undefined
    : withPoseGroups(
        document,
        getPoseGroups(document).map((group) =>
          group.id === groupId ? {...group, ...changes, id} : group,
        ),
      )
}
