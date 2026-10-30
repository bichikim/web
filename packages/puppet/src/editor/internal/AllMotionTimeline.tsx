import {createMemo, createSignal} from 'solid-js'
import {KeyedFor} from './KeyedFor'
import {getAvailableAction} from './get-available-action'
import {type PuppetParameterValueMap} from '../../deformation'
import {
  PUPPET_EASINGS,
  type PuppetDocument,
  type PuppetEasing,
  type PuppetMotion,
} from '../../player/document'
import type {MoveParameterKeyframesTarget} from './motion-keyframes'
import {
  getParameterTracks,
  getSelectedKeyframe as getSelectedKeyframeDetails,
  type KeyframeSelection,
} from './timeline-keyframe-selection'
import {AllMotionToolbar} from './all-motion-timeline/AllMotionToolbar'
import {AllMotionTimelineGroup} from './all-motion-timeline/AllMotionTimelineGroup'
export {ALL_MOTIONS_OPTION} from './all-motion-timeline/options'

export interface AllMotionTimelineProps {
  readonly zoom?: number | 'fit'
  readonly onZoomChange?: (zoom: number | 'fit') => void
  readonly onKeyframeAdd?: (motionId: string, parameterId: string, time: number) => boolean
  readonly document: PuppetDocument
  readonly framesPerSecond: number
  readonly getCurrentTime: (motion: PuppetMotion) => number
  readonly onDurationChange?: (motionId: string, duration: number) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onFramesPerSecondChange?: (framesPerSecond: number) => void
  readonly onKeyframesDelete?: (
    motionId: string,
    parameterId: string,
    times: ReadonlyArray<number>,
  ) => boolean
  readonly onKeyframesEasingChange?: (
    motionId: string,
    parameterId: string,
    times: ReadonlyArray<number>,
    easing: PuppetEasing,
  ) => boolean
  readonly onKeyframeMove?: (move: MoveParameterKeyframesTarget) => boolean
  readonly onMotionSeek?: (motionId: string, time: number) => void
  readonly onMotionAdd?: () => void
  readonly onMotionDelete?: (motionId: string) => void
  readonly onMotionRename?: (motionId: string, name: string) => void
  readonly onParameterRemove?: (motionId: string, parameterId: string) => boolean
  readonly onViewChange: (value: string) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly titleId: string
}

interface ActiveParameterSelection {
  readonly motionId: string
  readonly parameterId: string
}

interface AllMotionKeyframeSelection extends ActiveParameterSelection {
  readonly selection: KeyframeSelection
}

const getSelectedKeyframe = (
  document: PuppetDocument,
  selection: AllMotionKeyframeSelection | null,
) => {
  if (selection === null) {
    return null
  }
  const motion = document.motions.find((candidate) => candidate.id === selection.motionId)
  return getSelectedKeyframeDetails(selection.selection, getParameterTracks(document, motion))
}

export const AllMotionTimeline = (props: AllMotionTimelineProps) => {
  const [activeParameter, setActiveParameter] = createSignal<ActiveParameterSelection | null>(null)
  const [keyframeSelection, setKeyframeSelection] = createSignal<AllMotionKeyframeSelection | null>(
    null,
  )
  const selectedKeyframe = createMemo(() =>
    getSelectedKeyframe(props.document, keyframeSelection()),
  )
  const handleEasingChange = (value: string) => {
    const current = keyframeSelection()
    const details = selectedKeyframe()
    const easing = PUPPET_EASINGS.find((candidate) => candidate === value)
    if (current === null || details === null || easing === undefined) {
      return
    }
    props.onKeyframesEasingChange?.(
      current.motionId,
      current.parameterId,
      details.editableTimes,
      easing,
    )
  }

  return (
    <>
      <AllMotionToolbar
        zoom={props.zoom}
        onZoomChange={props.onZoomChange}
        easing={(selectedKeyframe()?.easing ?? 'linear') satisfies PuppetEasing}
        framesPerSecond={props.framesPerSecond}
        hasEditableSelection={
          (selectedKeyframe()?.editableTimes.length ?? 0) > 0 &&
          props.onKeyframesEasingChange !== undefined
        }
        motionIds={props.document.motions.map((motion) => motion.id)}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onFramesPerSecondChange={props.onFramesPerSecondChange}
        onEasingChange={handleEasingChange}
        onMotionAdd={props.onMotionAdd}
        onViewChange={props.onViewChange}
        titleId={props.titleId}
      />
      <div class="timeline-motion-groups">
        <KeyedFor each={props.document.motions} key={(motion) => motion.id}>
          {(motion) => {
            const selectedParameterId = () => {
              const selection = activeParameter()
              return selection?.motionId === motion().id ? selection.parameterId : null
            }
            const selection = () => {
              const current = keyframeSelection()
              return current?.motionId === motion().id ? current.selection : null
            }
            const handleParameterSelect = (parameterId: string) => {
              setActiveParameter({motionId: motion().id, parameterId})
            }
            const handleParameterRemove = (parameterId: string) => {
              if (props.onParameterRemove?.(motion().id, parameterId) !== true) {
                return
              }
              setActiveParameter((current) =>
                current?.motionId === motion().id && current.parameterId === parameterId
                  ? null
                  : current,
              )
              setKeyframeSelection((current) =>
                current?.motionId === motion().id && current.parameterId === parameterId
                  ? null
                  : current,
              )
            }

            return (
              <AllMotionTimelineGroup
                zoom={props.zoom}
                currentTime={props.getCurrentTime(motion())}
                document={props.document}
                framesPerSecond={props.framesPerSecond}
                motion={motion()}
                motionIds={props.document.motions.map((candidate) => candidate.id)}
                onDelete={getAvailableAction(props.onMotionDelete, () =>
                  props.onMotionDelete?.(motion().id),
                )}
                onDurationChange={getAvailableAction(props.onDurationChange, (duration) =>
                  props.onDurationChange?.(motion().id, duration),
                )}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onKeyframeAdd={getAvailableAction(
                  props.onKeyframeAdd,
                  (parameterId, time) =>
                    props.onKeyframeAdd?.(motion().id, parameterId, time) === true,
                )}
                onKeyframesDelete={getAvailableAction(
                  props.onKeyframesDelete,
                  (parameterId, times) =>
                    props.onKeyframesDelete?.(motion().id, parameterId, times) === true,
                )}
                onKeyframeMove={getAvailableAction(
                  props.onKeyframeMove,
                  (move) => props.onKeyframeMove?.({...move, motionId: motion().id}) === true,
                )}
                onParameterSelect={handleParameterSelect}
                onParameterRemove={getAvailableAction(
                  props.onParameterRemove,
                  handleParameterRemove,
                )}
                onRename={getAvailableAction(props.onMotionRename, (name) =>
                  props.onMotionRename?.(motion().id, name),
                )}
                onSeek={getAvailableAction(props.onMotionSeek, (time) =>
                  props.onMotionSeek?.(motion().id, time),
                )}
                onSelectionChange={(nextSelection) =>
                  setKeyframeSelection(
                    nextSelection === null
                      ? null
                      : {
                          motionId: motion().id,
                          parameterId: nextSelection.parameterId,
                          selection: nextSelection,
                        },
                  )
                }
                parameterValues={props.parameterValues}
                selectedParameterId={selectedParameterId()}
                selection={selection()}
              />
            )
          }}
        </KeyedFor>
      </div>
    </>
  )
}
