import type {PuppetDocument} from '../../player'
import {createMemo} from 'solid-js'
import {getVisibleParameters} from './parameter-presentation'
import type {ParameterTimelineTrack} from './timeline-keyframe-selection'

export const addTimelineParameterRow = (
  document: PuppetDocument,
  motionId: string,
  parameterId: string,
): PuppetDocument | undefined => {
  if (!getVisibleParameters(document).some((parameter) => parameter.id === parameterId)) {
    return undefined
  }

  const motion = document.motions.find((candidate) => candidate.id === motionId)
  if (motion === undefined || motion.timelineParameterIds?.includes(parameterId)) {
    return undefined
  }

  return {
    ...document,
    motions: document.motions.map((candidate) =>
      candidate.id === motionId
        ? {
            ...candidate,
            timelineParameterIds: [...(candidate.timelineParameterIds ?? []), parameterId],
          }
        : candidate,
    ),
  }
}

export const removeTimelineParameterRow = (
  document: PuppetDocument,
  motionId: string,
  parameterId: string,
): PuppetDocument | undefined => {
  const motion = document.motions.find((candidate) => candidate.id === motionId)
  if (
    motion === undefined ||
    (!motion.timelineParameterIds?.includes(parameterId) &&
      !motion.tracks.some(
        (track) => track.kind === 'parameter' && track.parameterId === parameterId,
      ))
  ) {
    return undefined
  }

  return {
    ...document,
    motions: document.motions.map((candidate) =>
      candidate.id === motionId
        ? {
            ...candidate,
            timelineParameterIds: candidate.timelineParameterIds?.filter(
              (id) => id !== parameterId,
            ),
            tracks: candidate.tracks.filter(
              (track) => track.kind !== 'parameter' || track.parameterId !== parameterId,
            ),
          }
        : candidate,
    ),
  }
}

interface TimelineParameterRowActions {
  readonly document: () => PuppetDocument
  readonly motionId: () => string | undefined
  readonly tracks: () => ReadonlyArray<ParameterTimelineTrack>
  readonly onDocumentChange: () => ((document: PuppetDocument) => void) | undefined
  readonly onSelect: (parameterId: string | null) => void
}

export const createTimelineParameterRowActions = (options: TimelineParameterRowActions) => {
  const available = createMemo(() => {
    const displayedIds = new Set(options.tracks().map((track) => track.parameter.id))
    return getVisibleParameters(options.document()).filter(
      (parameter) => !displayedIds.has(parameter.id),
    )
  })

  const add = (parameterId: string) => {
    const motionId = options.motionId()
    const onDocumentChange = options.onDocumentChange()
    if (motionId === undefined || onDocumentChange === undefined) {
      return
    }
    const document = addTimelineParameterRow(options.document(), motionId, parameterId)
    if (document !== undefined) {
      onDocumentChange(document)
      options.onSelect(parameterId)
    }
  }

  const remove = (motionId: string, parameterId: string) => {
    const onDocumentChange = options.onDocumentChange()
    if (onDocumentChange === undefined) {
      return false
    }
    const document = removeTimelineParameterRow(options.document(), motionId, parameterId)
    if (document === undefined) {
      return false
    }
    onDocumentChange(document)
    options.onSelect(null)
    return true
  }

  return {add, available, remove}
}
