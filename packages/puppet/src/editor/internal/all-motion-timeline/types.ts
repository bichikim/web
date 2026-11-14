import {type PuppetParameterValueMap} from '../../../deformation'
import {type PuppetDocument, type PuppetMotion} from '../../../player/document'
import type {MoveParameterKeyframesTarget} from '../motion-keyframes'
import {type KeyframeSelection} from '../timeline-keyframe-selection'

export interface AllMotionTimelineGroupProps {
  readonly zoom?: number | 'fit'
  readonly currentTime: number
  readonly document: PuppetDocument
  readonly framesPerSecond: number
  readonly motion: PuppetMotion
  readonly motionIds: ReadonlyArray<string>
  readonly onDelete?: () => void
  readonly onDurationChange?: (duration: number) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onKeyframeAdd?: (parameterId: string, time: number) => boolean
  readonly onKeyframesDelete?: (parameterId: string, times: ReadonlyArray<number>) => boolean
  readonly onKeyframeMove?: (move: Omit<MoveParameterKeyframesTarget, 'motionId'>) => boolean
  readonly onSelectionChange: (selection: KeyframeSelection | null) => void
  readonly onParameterSelect: (parameterId: string) => void
  readonly onParameterRemove?: (parameterId: string) => void
  readonly onRename?: (name: string) => void
  readonly onSeek?: (time: number) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly selectedParameterId: string | null
  readonly selection: KeyframeSelection | null
}
