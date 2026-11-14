import {getAvailableAction} from '../get-available-action'
import {getFrame} from '../timeline-keyframe-selection'
import {TimelineDopesheet} from '../TimelineDopesheet'
import type {AllMotionTimelineGroupProps} from './types'
export type {AllMotionTimelineGroupProps} from './types'
import {AllMotionTimelineHeading} from './AllMotionTimelineHeading'
import {useAllMotionTimelineGroup} from './use-all-motion-timeline-group'

export const AllMotionTimelineGroup = (props: AllMotionTimelineGroupProps) => {
  const {
    tracks,
    values,
    minimumDuration,
    handleKeyframeSelect,
    handleKeyframeMove,
    handleParameterSelect,
    handleSeek,
    handleKeyframeAdd,
    handleKeyframesDelete,
  } = useAllMotionTimelineGroup(() => props)
  return (
    <section class="timeline-motion-group" aria-label={`${props.motion.id} 타임라인`}>
      <TimelineDopesheet
        zoom={props.zoom}
        currentTime={props.currentTime}
        duration={props.motion.duration}
        framesPerSecond={props.framesPerSecond}
        motion={props.motion}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onKeyframeAdd={getAvailableAction(props.onKeyframeAdd, handleKeyframeAdd)}
        onKeyframesDelete={getAvailableAction(props.onKeyframesDelete, handleKeyframesDelete)}
        onKeyframeSelect={handleKeyframeSelect}
        onKeyframeMove={handleKeyframeMove}
        onParameterSelect={handleParameterSelect}
        onParameterRemove={props.onParameterRemove}
        onSeek={handleSeek}
        rulerLabel={<AllMotionTimelineHeading {...props} minimumDuration={minimumDuration()} />}
        rulerStatus={
          <>
            {getFrame(props.currentTime, props.framesPerSecond)}f /{' '}
            {getFrame(props.motion.duration, props.framesPerSecond)}f ·{' '}
            {props.currentTime.toFixed(2)}s
          </>
        }
        selectedParameterId={props.selectedParameterId}
        seekLabel={`${props.motion.id} 재생 위치`}
        selection={props.selection}
        tracks={tracks()}
        values={values()}
      />
    </section>
  )
}
