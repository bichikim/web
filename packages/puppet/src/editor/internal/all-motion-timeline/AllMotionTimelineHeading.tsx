import {type PuppetMotion} from '../../../player/document'
import {TimelineSettingsControls} from '../TimelineSettingsControls'
import {TimelineMotionName} from '../TimelineMotionName'

export interface AllMotionTimelineHeadingProps {
  readonly motion: PuppetMotion
  readonly motionIds: ReadonlyArray<string>
  readonly minimumDuration: number
  readonly framesPerSecond: number
  readonly onDelete?: () => void
  readonly onRename?: (name: string) => void
  readonly onDurationChange?: (duration: number) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

export const AllMotionTimelineHeading = (props: AllMotionTimelineHeadingProps) => (
  <div class="timeline-motion-group-heading">
    <TimelineMotionName
      motionId={props.motion.id}
      motionIds={props.motionIds}
      onDelete={props.onDelete}
      onRename={props.onRename}
    >
      <TimelineSettingsControls
        duration={props.motion.duration}
        durationLabel={`${props.motion.id} 모션 길이`}
        durationMinimum={props.minimumDuration}
        framesPerSecond={props.framesPerSecond}
        onDurationChange={props.onDurationChange}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        showDurationLabel={false}
        showFramesPerSecond={false}
      />
    </TimelineMotionName>
  </div>
)
