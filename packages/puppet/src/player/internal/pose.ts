import {DEFAULT_PUPPET_POSE_FADE_TIME, type PuppetDocument, type PuppetPoseGroup} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import {resolveParameterValue} from '../parameter-value'

const MAXIMUM_BACKGROUND_OPACITY = 0.15
const POSE_PARAMETER_EPSILON = 0.001

/** A pose group's selected entry and entry opacities, indexed like the group's entries. */
export interface PoseGroupState {
  readonly selected: number
  readonly weights: ReadonlyArray<number>
}

/** Pose group states by group ID. */
export type PoseState = ReadonlyMap<string, PoseGroupState>

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
  if (group.sourceParameterIds !== undefined) {
    const maximumHidden = Math.max(
      1 - shown,
      shown < 1 ? 1 - MAXIMUM_BACKGROUND_OPACITY / (1 - shown) : 0,
    )
    return previous.map((weight, index) =>
      index === selected ? shown : Math.min(weight, maximumHidden),
    )
  }
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
    const sourceSelection = group.sourceParameterIds?.findIndex(
      (id) =>
        (options.parameterValues[id] ?? parameterById.get(id)?.defaultValue ?? 0) >
        POSE_PARAMETER_EPSILON,
    )
    const selected =
      sourceSelection !== undefined && sourceSelection >= 0
        ? sourceSelection
        : selectPoseEntry(
            group,
            resolveParameterValue(parameter, options.parameterValues[group.parameterId]),
          )
    const weights = fadeGroup({
      deltaTime: options.deltaTime,
      group,
      previous: options.poseState.get(group.id)?.weights,
      selected,
      settle: options.settle === true,
    })
    return [{group, selected, weights}]
  })
  return {
    opacityByPartId: new Map(
      groups.flatMap(({group, weights}) =>
        group.entries.flatMap((entry, index) =>
          entry.partIds.map((partId) => [partId, weights[index]!] as const),
        ),
      ),
    ),
    poseState: new Map(groups.map(({group, selected, weights}) => [group.id, {selected, weights}])),
  }
}

/**
 * Whether any group has yet to show only its selected entry, including a selection made
 * without time passing (the fade then starts on the next frame).
 */
export const isPoseFading = (state: PoseState) =>
  [...state.values()].some(({selected, weights}) =>
    weights.some((weight, index) => (index === selected ? weight < 1 : weight > 0)),
  )
