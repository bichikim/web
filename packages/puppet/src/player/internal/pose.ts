import {DEFAULT_PUPPET_POSE_FADE_TIME, type PuppetDocument, type PuppetPoseGroup} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import {resolveParameterValue} from '../parameter-value'

/** Entry opacities per pose group, indexed like the group's entries. */
export type PoseState = ReadonlyMap<string, ReadonlyArray<number>>

export interface EvaluatePoseOptions {
  readonly deltaTime: number
  readonly document: PuppetDocument
  readonly parameterValues: PuppetParameterValueMap
  readonly poseState: PoseState
  /** Jumps to the selected entries without fading. */
  readonly settle?: boolean
}

export interface PoseEvaluation {
  /** Opacity multipliers for posed parts; other parts are absent. */
  readonly opacityByPartId: ReadonlyMap<string, number>
  readonly poseState: PoseState
}

/** Index of the entry nearest to the selector value; ties pick the first. */
export const selectPoseEntry = (group: PuppetPoseGroup, value: number) =>
  group.entries.reduce(
    (best, entry, index) =>
      Math.abs(entry.value - value) < Math.abs(group.entries[best]!.value - value) ? index : best,
    0,
  )

interface FadeGroupOptions {
  readonly deltaTime: number
  readonly group: PuppetPoseGroup
  readonly previous: ReadonlyArray<number> | undefined
  readonly selected: number
  readonly settle: boolean
}

const fadeGroup = ({
  deltaTime,
  group,
  previous,
  selected,
  settle,
}: FadeGroupOptions): ReadonlyArray<number> => {
  if (settle || previous === undefined || previous.length !== group.entries.length) {
    return group.entries.map((_, index) => (index === selected ? 1 : 0))
  }
  const duration = group.fadeTime ?? DEFAULT_PUPPET_POSE_FADE_TIME
  const step = duration > 0 ? Math.max(0, deltaTime) / duration : 1
  const shown = Math.min(1, previous[selected]! + step)
  // Fading entries never exceed the selected entry's remainder, so the stack stays covered.
  return previous.map((weight, index) =>
    index === selected ? shown : Math.min(Math.max(0, weight - step), 1 - shown),
  )
}

export const evaluatePose = (options: EvaluatePoseOptions): PoseEvaluation => {
  const parameterById = new Map(
    (options.document.parameters ?? []).map((parameter) => [parameter.id, parameter]),
  )
  const groups = (options.document.poseGroups ?? []).flatMap((group) => {
    const parameter = parameterById.get(group.parameterId)
    if (parameter === undefined) {
      return []
    }
    const selected = selectPoseEntry(
      group,
      resolveParameterValue(parameter, options.parameterValues[group.parameterId]),
    )
    const weights = fadeGroup({
      deltaTime: options.deltaTime,
      group,
      previous: options.poseState.get(group.id),
      selected,
      settle: options.settle === true,
    })
    return [{group, weights}]
  })
  return {
    opacityByPartId: new Map(
      groups.flatMap(({group, weights}) =>
        group.entries.flatMap((entry, index) =>
          entry.partIds.map((partId) => [partId, weights[index]!] as const),
        ),
      ),
    ),
    poseState: new Map(groups.map(({group, weights}) => [group.id, weights])),
  }
}

/** Whether any group is between entries. */
export const isPoseFading = (state: PoseState) =>
  [...state.values()].some((weights) => weights.some((weight) => weight > 0 && weight < 1))
