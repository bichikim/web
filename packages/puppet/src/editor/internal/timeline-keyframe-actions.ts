import type {PuppetDocument, PuppetEasing, PuppetMotion} from '../../player/document'
import {deleteTimelineKeyframes} from './delete-timeline-keyframes'
import {setParameterKeyframesEasing} from './motion-keyframes'
import {easeSelectedKeyframes, type KeyframeSelection} from './timeline-keyframe-selection'

type DocumentChange = ((document: PuppetDocument) => void) | undefined

/** Reports `document` when there is one and a change handler; returns whether it did. */
export const applyDocumentChange = (
  onDocumentChange: DocumentChange,
  document: PuppetDocument | undefined,
) => {
  if (onDocumentChange === undefined || document === undefined) {
    return false
  }
  onDocumentChange(document)
  return true
}

interface KeyframeEditActionsOptions {
  readonly document: () => PuppetDocument
  readonly motion: () => PuppetMotion | undefined
  readonly onDocumentChange: () => DocumentChange
  readonly selection: () => KeyframeSelection | null
}

/** Deletes keyframes and changes their easing in the timeline's motion. */
export const createKeyframeEditActions = (options: KeyframeEditActionsOptions) => ({
  deleteKeyframes: (motionId: string, parameterId: string, times: ReadonlyArray<number>) =>
    applyDocumentChange(
      options.onDocumentChange(),
      deleteTimelineKeyframes({document: options.document(), motionId, parameterId, times}),
    ),
  handleEasingChange: (value: string) =>
    applyDocumentChange(
      options.onDocumentChange(),
      easeSelectedKeyframes({
        document: options.document(),
        motion: options.motion(),
        selection: options.selection(),
        value,
      }),
    ),
  updateKeyframesEasing: (
    motionId: string,
    parameterId: string,
    times: ReadonlyArray<number>,
    easing: PuppetEasing,
  ) =>
    applyDocumentChange(
      options.onDocumentChange(),
      setParameterKeyframesEasing({
        document: options.document(),
        easing,
        motionId,
        parameterId,
        times,
      }),
    ),
})
