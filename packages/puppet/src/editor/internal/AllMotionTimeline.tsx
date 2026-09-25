import {createEffect, createMemo, createSignal, For, on} from 'solid-js'

import {EditorButton, EditorSelect} from '../../design-system'
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
  updateKeyframeSelection,
} from './timeline-keyframe-selection'
import {TimelineDopesheet} from './TimelineDopesheet'

export const ALL_MOTIONS_OPTION = '모든 타임라인 보기'

interface AllMotionToolbarProps {
  readonly canDeleteKeyframes: boolean
  readonly easing: PuppetEasing
  readonly framesPerSecond: number
  readonly hasEditableSelection: boolean
  readonly motionIds: ReadonlyArray<string>
  readonly onMotionAdd?: () => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onFramesPerSecondChange?: (framesPerSecond: number) => void
  readonly onEasingChange?: (value: string) => void
  readonly onKeyframesDelete?: () => void
  readonly onViewChange: (value: string) => void
  readonly selectedKeyframeCount: number
  readonly titleId: string
}

const AllMotionToolbar = (props: AllMotionToolbarProps) => (
  <header class="timeline-toolbar timeline-toolbar-all">
    <div class="timeline-label">
      <span id={props.titleId}>Timeline</span>
    </div>
    <div class="timeline-actions">
      <TimelineMotionControls
        motionIds={props.motionIds}
        onAdd={props.onMotionAdd}
        onViewChange={props.onViewChange}
        options={[ALL_MOTIONS_OPTION, ...props.motionIds]}
        value={ALL_MOTIONS_OPTION}
      />
      <TimelineSettingsControls
        framesPerSecond={props.framesPerSecond}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onFramesPerSecondChange={props.onFramesPerSecondChange}
      />
      <EditorButton
        class="timeline-keyframe-delete"
        disabled={!props.canDeleteKeyframes || props.onKeyframesDelete === undefined}
        type="button"
        onClick={() => props.onKeyframesDelete?.()}
      >
        {props.selectedKeyframeCount <= 1
          ? '선택 키프레임 삭제'
          : `선택 키프레임 ${props.selectedKeyframeCount}개 삭제`}
      </EditorButton>
      <label class="timeline-easing">
        <span>다음 키프레임까지</span>
        <EditorSelect
          label="키프레임 이징"
          disabled={!props.hasEditableSelection || props.onEasingChange === undefined}
          value={props.easing}
          options={[...PUPPET_EASINGS]}
          onChange={(value) => props.onEasingChange?.(value)}
        />
      </label>
    </div>
  </header>
)

interface AllMotionTimelineGroupProps {
  readonly currentTime: number
  readonly document: PuppetDocument
  readonly framesPerSecond: number
  readonly motion: PuppetMotion
  readonly motionIds: ReadonlyArray<string>
  readonly onDelete?: () => void
  readonly onDurationChange?: (duration: number) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onKeyframeMove?: (move: Omit<MoveParameterKeyframesTarget, 'motionId'>) => boolean
  readonly onSelectionChange: (selection: KeyframeSelection | null) => void
  readonly onParameterSelect: (parameterId: string) => void
  readonly onRename?: (name: string) => void
  readonly onSeek?: (time: number) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly selectedParameterId: string | null
  readonly selection: KeyframeSelection | null
}

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

  createEffect(
    on(
      () => props.currentTime,
      (time) => {
        const parameterId = props.selection?.parameterId ?? props.selectedParameterId
        if (parameterId === null) {
          return
        }
        const nextSelection = getKeyframeSelectionAtTime(
          tracks(),
          time,
          parameterId,
          props.framesPerSecond,
        )
        props.onSelectionChange(
          nextSelection !== null &&
            isKeyframeSelected(props.selection, parameterId, nextSelection.time)
            ? {...props.selection!, time: nextSelection.time}
            : nextSelection,
        )
      },
      {defer: true},
    ),
  )

  return (
    <section class="timeline-motion-group" aria-label={`${props.motion.id} 타임라인`}>
      <TimelineDopesheet
        currentTime={props.currentTime}
        duration={props.motion.duration}
        framesPerSecond={props.framesPerSecond}
        motion={props.motion}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onKeyframeSelect={handleKeyframeSelect}
        onKeyframeMove={handleKeyframeMove}
        onParameterSelect={handleParameterSelect}
        onSeek={handleSeek}
        rulerLabel={
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
                durationMinimum={minimumDuration()}
                framesPerSecond={props.framesPerSecond}
                onDurationChange={props.onDurationChange}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                showDurationLabel={false}
                showFramesPerSecond={false}
              />
            </TimelineMotionName>
          </div>
        }
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
  const handleKeyframesDelete = () => {
    const current = keyframeSelection()
    if (
      current !== null &&
      props.onKeyframesDelete?.(current.motionId, current.parameterId, current.selection.times) ===
        true
    ) {
      setKeyframeSelection(null)
    }
  }
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
        canDeleteKeyframes={keyframeSelection() !== null && props.onKeyframesDelete !== undefined}
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
        onKeyframesDelete={handleKeyframesDelete}
        onMotionAdd={props.onMotionAdd}
        onViewChange={props.onViewChange}
        selectedKeyframeCount={keyframeSelection()?.selection.times.length ?? 0}
        titleId={props.titleId}
      />
      <div class="timeline-motion-groups">
        <For each={props.document.motions}>
          {(motion) => {
            const selectedParameterId = () => {
              const selection = activeParameter()
              return selection?.motionId === motion.id ? selection.parameterId : null
            }
            const selection = () => {
              const current = keyframeSelection()
              return current?.motionId === motion.id ? current.selection : null
            }
            const handleParameterSelect = (parameterId: string) => {
              setActiveParameter({motionId: motion.id, parameterId})
            }

            return (
              <AllMotionTimelineGroup
                currentTime={props.getCurrentTime(motion)}
                document={props.document}
                framesPerSecond={props.framesPerSecond}
                motion={motion}
                motionIds={props.document.motions.map((candidate) => candidate.id)}
                onDelete={
                  props.onMotionDelete === undefined
                    ? undefined
                    : () => props.onMotionDelete?.(motion.id)
                }
                onDurationChange={
                  props.onDurationChange === undefined
                    ? undefined
                    : (duration) => props.onDurationChange?.(motion.id, duration)
                }
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onKeyframeMove={
                  props.onKeyframeMove === undefined
                    ? undefined
                    : (move) => props.onKeyframeMove?.({...move, motionId: motion.id}) === true
                }
                onParameterSelect={handleParameterSelect}
                onRename={
                  props.onMotionRename === undefined
                    ? undefined
                    : (name) => props.onMotionRename?.(motion.id, name)
                }
                onSeek={
                  props.onMotionSeek === undefined
                    ? undefined
                    : (time) => props.onMotionSeek?.(motion.id, time)
                }
                onSelectionChange={(nextSelection) =>
                  setKeyframeSelection(
                    nextSelection === null
                      ? null
                      : {
                          motionId: motion.id,
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
        </For>
      </div>
    </>
  )
}
