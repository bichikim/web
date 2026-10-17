import {createEffect, createMemo, createSignal, on} from 'solid-js'
import {KeyedFor} from './KeyedFor'
import {getAvailableAction} from './get-available-action'

import {EditorSelect} from '../../design-system'
import {getDefaultParameterValueMap, type PuppetParameterValueMap} from '../../deformation'
import {
  PUPPET_EASINGS,
  type PuppetDocument,
  type PuppetEasing,
  type PuppetMotion,
} from '../../player/document'
import {sampleMotionParameterValues} from '../../player/internal/motion'
import type {MoveParameterKeyframesTarget} from './motion-keyframes'
import {TimelineSettingsControls} from './TimelineSettingsControls'
import {TimelineMotionControls} from './TimelineMotionControls'
import {TimelineMotionName} from './TimelineMotionName'
import {
  getFrame,
  getKeyframeSelectionAtTime,
  getParameterTracks,
  getSelectedKeyframe as getSelectedKeyframeDetails,
  isKeyframeSelected,
  type KeyframeSelection,
  type ParameterTimelineKeyframe,
  type ParameterTimelineTrack,
  retainKeyframeSelectionAtTime,
  updateKeyframeSelection,
} from './timeline-keyframe-selection'
import {TimelineDopesheet} from './TimelineDopesheet'
import {TimelineZoomControls} from './TimelineZoomControls'

export const ALL_MOTIONS_OPTION = '모든 타임라인 보기'

interface AllMotionToolbarProps {
  readonly zoom?: number | 'fit'
  readonly onZoomChange?: (zoom: number | 'fit') => void
  readonly easing: PuppetEasing
  readonly framesPerSecond: number
  readonly hasEditableSelection: boolean
  readonly motionIds: ReadonlyArray<string>
  readonly onMotionAdd?: () => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onFramesPerSecondChange?: (framesPerSecond: number) => void
  readonly onEasingChange?: (value: string) => void
  readonly onViewChange: (value: string) => void
  readonly titleId: string
}

const AllMotionToolbar = (props: AllMotionToolbarProps) => (
  <header class="timeline-toolbar">
    <div class="timeline-actions">
      <div
        class="timeline-control-group timeline-document-controls"
        role="group"
        aria-label="모션 관리"
      >
        <div class="timeline-label">
          <span id={props.titleId}>Timeline</span>
        </div>
        <TimelineMotionControls
          motionIds={props.motionIds}
          onAdd={props.onMotionAdd}
          onViewChange={props.onViewChange}
          options={[ALL_MOTIONS_OPTION, ...props.motionIds]}
          value={ALL_MOTIONS_OPTION}
        />
      </div>
      <div class="timeline-control-group" role="group" aria-label="재생 설정">
        <TimelineSettingsControls
          framesPerSecond={props.framesPerSecond}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onFramesPerSecondChange={props.onFramesPerSecondChange}
        />
      </div>
      <div
        class="timeline-control-group timeline-keyframe-controls"
        role="group"
        aria-label="키프레임 편집"
      >
        <label class="timeline-easing">
          <span data-tooltip="다음 키프레임까지의 보간 방식">이징</span>
          <EditorSelect
            label="키프레임 이징"
            disabled={!props.hasEditableSelection || props.onEasingChange === undefined}
            value={props.easing}
            options={[...PUPPET_EASINGS]}
            onChange={(value) => props.onEasingChange?.(value)}
          />
        </label>
      </div>
      <div class="timeline-control-group" role="group" aria-label="타임라인 보기">
        <TimelineZoomControls zoom={props.zoom} onChange={props.onZoomChange} />
      </div>
    </div>
  </header>
)

interface AllMotionTimelineGroupProps {
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

const AllMotionTimelineHeading = (
  props: AllMotionTimelineGroupProps & {readonly minimumDuration: number},
) => (
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

const AllMotionTimelineGroup = (props: AllMotionTimelineGroupProps) => {
  const tracks = createMemo(() => getParameterTracks(props.document, props.motion))
  const values = createMemo(() =>
    sampleMotionParameterValues({
      motion: props.motion,
      parameters: props.document.parameters,
      parameterValues: props.parameterValues ?? getDefaultParameterValueMap(props.document),
      time: props.currentTime,
    }),
  )
  const minimumDuration = () =>
    Math.max(
      1 / props.framesPerSecond,
      ...props.motion.tracks.flatMap((track) => track.keyframes.map((keyframe) => keyframe.time)),
    )
  const handleKeyframeSelect = (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    extend: boolean,
  ) => {
    const parameterId = track.parameter.id
    props.onParameterSelect(parameterId)
    props.onSelectionChange(
      updateKeyframeSelection(props.selection, parameterId, keyframe.time, extend),
    )
    props.onSeek?.(keyframe.time)
  }
  const handleKeyframeMove = (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    time: number,
  ) => {
    const parameterId = track.parameter.id
    const selectedTimes = isKeyframeSelected(props.selection, parameterId, keyframe.time)
      ? props.selection!.times
      : [keyframe.time]

    if (
      props.onKeyframeMove?.({
        nextTime: time,
        parameterId,
        time: keyframe.time,
        times: selectedTimes,
      }) !== true
    ) {
      return
    }

    const timeOffset = time - keyframe.time
    props.onParameterSelect(parameterId)
    props.onSelectionChange({
      parameterId,
      time,
      times: selectedTimes.map((selectedTime) => selectedTime + timeOffset),
    })
    props.onSeek?.(time)
  }
  const handleParameterSelect = (parameterId: string) => {
    props.onSelectionChange(
      getKeyframeSelectionAtTime(tracks(), props.currentTime, parameterId, props.framesPerSecond),
    )
    props.onParameterSelect(parameterId)
  }
  const handleSeek = (time: number, parameterId?: string) => {
    const selectedParameterId = parameterId ?? props.selectedParameterId

    if (parameterId !== undefined) {
      props.onParameterSelect(parameterId)
    }
    props.onSelectionChange(
      getKeyframeSelectionAtTime(tracks(), time, selectedParameterId, props.framesPerSecond),
    )
    props.onSeek?.(time)
  }

  const handleKeyframeAdd = (track: ParameterTimelineTrack, time: number) =>
    props.onKeyframeAdd?.(track.parameter.id, time) === true
  const handleKeyframesDelete = (track: ParameterTimelineTrack, times: ReadonlyArray<number>) => {
    if (props.onKeyframesDelete?.(track.parameter.id, times) !== true) {
      return false
    }
    props.onSelectionChange(null)
    return true
  }

  createEffect(
    on(
      () => props.currentTime,
      (time) => {
        const parameterId = props.selection?.parameterId ?? props.selectedParameterId
        if (parameterId === null) {
          return
        }
        props.onSelectionChange(
          retainKeyframeSelectionAtTime({
            framesPerSecond: props.framesPerSecond,
            parameterId,
            selection: props.selection,
            time,
            tracks: tracks(),
          }),
        )
      },
      {defer: true},
    ),
  )

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
