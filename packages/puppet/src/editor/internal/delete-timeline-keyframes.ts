import {deleteParameterKeyframes, type EditParameterKeyframesOptions} from './motion-keyframes'
import {addTimelineParameterRow} from './timeline-parameter-rows'

export const deleteTimelineKeyframes = (options: EditParameterKeyframesOptions) =>
  deleteParameterKeyframes({
    ...options,
    document:
      addTimelineParameterRow(options.document, options.motionId, options.parameterId) ??
      options.document,
  })
