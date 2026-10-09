import {clamp} from 'es-toolkit/math'
import {createEffect, createMemo, createSignal, createUniqueId, on, Show} from 'solid-js'

import {getDefaultParameterValueMap, type PuppetParameterValueMap} from '../../deformation'
import {
  getPuppetFramesPerSecond,
  MAXIMUM_PUPPET_FRAMES_PER_SECOND,
  MINIMUM_PUPPET_FRAMES_PER_SECOND,
  type PuppetDocument,
  type PuppetEasing,
  type PuppetMotion,
} from '../../player/document'
import {sampleMotionParameterValues} from '../../player/internal/motion'
import {createTimelineParameterRowActions} from './timeline-parameter-rows'
import {ALL_MOTIONS_OPTION, AllMotionTimeline} from './AllMotionTimeline'
import {createTimelineMotionActions} from './create-timeline-motion-actions'
import {editMotion} from './edit-motion'
import {getAvailableAction} from './get-available-action'
import {deleteTimelineKeyframes} from './delete-timeline-keyframes'
import {insertParameterKeyframe} from './insert-parameter-keyframe'
import {
  moveParameterKeyframes,
  type MoveParameterKeyframesTarget,
  setParameterKeyframe,
  setParameterKeyframesEasing,
} from './motion-keyframes'
import {
  easeSelectedKeyframes,
  getFrame,
  getKeyframeSelectionAtTime,
  getParameterTracks,
  getSelectedKeyframe,
  isKeyframeSelected,
  type KeyframeSelection,
  type ParameterTimelineKeyframe,
  type ParameterTimelineTrack,
  retainKeyframeSelectionAtTime,
  type SelectedKeyframe,
  snapToFrame,
  updateKeyframeSelection,
} from './timeline-keyframe-selection'
import {TimelineDopesheet} from './TimelineDopesheet'
import {TimelineSettingsControls} from './TimelineSettingsControls'
import {TimelineMotionName} from './TimelineMotionName'
import {TimelineToolbar} from './TimelineToolbar'

export interface EditorTimelineProps {
  readonly currentTime?: number
  readonly document: PuppetDocument
  readonly isPlaying?: boolean
  readonly motionId?: string
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onMotionChange?: (motionId: string) => void
  readonly onMotionSeek?: (motionId: string, time: number) => void
  readonly onPlaybackToggle?: () => void
  readonly onSeek?: (time: number) => void
  readonly parameterValues?: PuppetParameterValueMap
}

const getActiveMotion = (document: PuppetDocument, motionId: string | undefined) =>
  document.motions.find((motion) => motion.id === motionId) ?? document.motions[0]

const applyDocumentChange = (
  onDocumentChange: EditorTimelineProps['onDocumentChange'],
  document: PuppetDocument | undefined,
) => {
  if (onDocumentChange === undefined || document === undefined) {
    return false
  }
  onDocumentChange(document)
  return true
}

const hasEditableSelection = (
  selection: SelectedKeyframe | null,
  onDocumentChange: EditorTimelineProps['onDocumentChange'],
) => selection !== null && selection.editableTimes.length > 0 && onDocumentChange !== undefined

const getMotionSeekAction = (
  motionSeek: EditorTimelineProps['onMotionSeek'],
  motionChange: EditorTimelineProps['onMotionChange'],
  seek: EditorTimelineProps['onSeek'],
  action: (motionId: string, time: number) => void,
) =>
  motionSeek !== undefined || (motionChange !== undefined && seek !== undefined)
    ? action
    : undefined

// eslint-disable-next-line max-lines-per-function
export const EditorTimeline = (props: EditorTimelineProps) => {
  const titleId = createUniqueId()
  const [selection, setSelection] = createSignal<KeyframeSelection | null>(null)
  const [activeParameterId, setActiveParameterId] = createSignal<string | null>(null)
  const [allMotionsVisible, setAllMotionsVisible] = createSignal(false)
  const [motionTimes, setMotionTimes] = createSignal<Readonly<Record<string, number>>>({})
  const motion = () => getActiveMotion(props.document, props.motionId)
  const framesPerSecond = () => getPuppetFramesPerSecond(props.document)
  const duration = () => motion()?.duration ?? 0
  const currentTime = () => clamp(props.currentTime ?? 0, 0, duration())
  const parameterTracks = createMemo(() => getParameterTracks(props.document, motion()))
  const parameterRows = createTimelineParameterRowActions({
    document: () => props.document,
    motionId: () => motion()?.id,
    onDocumentChange: () => props.onDocumentChange,
    onSelect: (parameterId) => {
      setActiveParameterId(parameterId)
      setSelection(null)
    },
    tracks: parameterTracks,
  })
  const parameterValues = createMemo(() =>
    sampleMotionParameterValues({
      motion: motion(),
      parameters: props.document.parameters,
      parameterValues: props.parameterValues ?? getDefaultParameterValueMap(props.document),
      time: currentTime(),
    }),
  )
  const selectedKeyframe = createMemo(() => getSelectedKeyframe(selection(), parameterTracks()))
  const motionIds = () => props.document.motions.map((candidate) => candidate.id)
  const motionOptions = () => (motionIds().length === 0 ? [] : [ALL_MOTIONS_OPTION, ...motionIds()])
  const minimumDuration = (targetMotion: PuppetMotion) =>
    Math.max(
      1 / framesPerSecond(),
      ...targetMotion.tracks.flatMap((track) => track.keyframes.map((keyframe) => keyframe.time)),
    )
  const activeMinimumDuration = () => {
    const activeMotion = motion()
    return activeMotion === undefined ? 0 : minimumDuration(activeMotion)
  }

  const getMotionTime = (targetMotion: PuppetMotion) =>
    clamp(
      motionTimes()[targetMotion.id] ?? (targetMotion.id === motion()?.id ? currentTime() : 0),
      0,
      targetMotion.duration,
    )

  const handleViewChange = (value: string) => {
    if (value === ALL_MOTIONS_OPTION) {
      setAllMotionsVisible(true)
      return
    }

    if (!props.document.motions.some((candidate) => candidate.id === value)) {
      return
    }

    setAllMotionsVisible(false)
    if (props.onMotionChange !== undefined) {
      props.onMotionChange(value)
      return
    }
    props.onMotionSeek?.(value, motionTimes()[value] ?? 0)
  }

  const handleMotionSeek = (motionId: string, time: number) => {
    setMotionTimes((current) => ({...current, [motionId]: time}))

    if (props.onMotionSeek !== undefined) {
      props.onMotionSeek(motionId, time)
      return
    }

    if (motion()?.id !== motionId) {
      props.onMotionChange?.(motionId)
    }
    props.onSeek?.(time)
  }

  const applyMotionEdit = (
    result: ReturnType<typeof editMotion>,
    timelineView: 'all' | 'single',
  ) => {
    if (result === undefined || props.onDocumentChange === undefined) {
      return
    }

    props.onDocumentChange(result.document)
    setAllMotionsVisible(timelineView === 'all')
    setSelection(null)
    setActiveParameterId(null)
    if (result.selectedMotionId !== null) {
      props.onMotionChange?.(result.selectedMotionId)
    }
  }

  const motionActions = createTimelineMotionActions({
    activeMotion: motion,
    applyEdit: applyMotionEdit,
    document: () => props.document,
    setMotionTimes,
  })

  const handleDurationChange = (motionId: string, nextDuration: number) => {
    const targetMotion = props.document.motions.find((candidate) => candidate.id === motionId)

    if (
      props.onDocumentChange === undefined ||
      targetMotion === undefined ||
      !Number.isFinite(nextDuration) ||
      nextDuration < minimumDuration(targetMotion)
    ) {
      return
    }

    props.onDocumentChange({
      ...props.document,
      motions: props.document.motions.map((candidate) =>
        candidate.id === motionId ? {...candidate, duration: nextDuration} : candidate,
      ),
    })
  }

  const handleFramesPerSecondChange = (nextFramesPerSecond: number) => {
    if (
      props.onDocumentChange === undefined ||
      !Number.isInteger(nextFramesPerSecond) ||
      nextFramesPerSecond < MINIMUM_PUPPET_FRAMES_PER_SECOND ||
      nextFramesPerSecond > MAXIMUM_PUPPET_FRAMES_PER_SECOND
    ) {
      return
    }

    props.onDocumentChange({...props.document, framesPerSecond: nextFramesPerSecond})
  }

  const handleActiveDurationChange = (nextDuration: number) => {
    const activeMotion = motion()

    if (activeMotion !== undefined) {
      handleDurationChange(activeMotion.id, nextDuration)
    }
  }

  const handleParameterSelect = (parameterId: string) => {
    setActiveParameterId(parameterId)
    setSelection(
      getKeyframeSelectionAtTime(parameterTracks(), currentTime(), parameterId, framesPerSecond()),
    )
  }

  const handleSeek = (time: number, parameterId?: string) => {
    const selectedParameterId = parameterId ?? activeParameterId()
    const nextSelection = getKeyframeSelectionAtTime(
      parameterTracks(),
      time,
      selectedParameterId,
      framesPerSecond(),
    )

    if (parameterId !== undefined) {
      setActiveParameterId(parameterId)
    }
    setSelection(nextSelection)

    props.onSeek?.(time)
  }

  createEffect(
    on(
      () => props.currentTime,
      (time) => {
        setSelection((current) =>
          retainKeyframeSelectionAtTime({
            framesPerSecond: framesPerSecond(),
            parameterId: activeParameterId(),
            selection: current,
            time: clamp(time ?? 0, 0, duration()),
            tracks: parameterTracks(),
          }),
        )
      },
    ),
  )

  createEffect(() => {
    const activeMotion = motion()
    const time = props.currentTime

    if (activeMotion === undefined || time === undefined) {
      return
    }

    const nextTime = clamp(time, 0, activeMotion.duration)
    setMotionTimes((current) =>
      current[activeMotion.id] === nextTime ? current : {...current, [activeMotion.id]: nextTime},
    )
  })

  createEffect(
    on(
      () => props.motionId,
      () => {
        setSelection(null)
      },
      {defer: true},
    ),
  )

  const updateParameterKeyframe = (parameterId: string, value: number) => {
    const activeMotion = motion()

    if (
      activeMotion === undefined ||
      props.onDocumentChange === undefined ||
      !Number.isFinite(value)
    ) {
      return
    }

    const time = snapToFrame(currentTime(), activeMotion.duration, framesPerSecond())
    const document = setParameterKeyframe({
      document: props.document,
      motionId: activeMotion.id,
      parameterId,
      time,
      value,
    })

    if (document !== undefined) {
      props.onDocumentChange(document)
      setActiveParameterId(parameterId)
      setSelection({parameterId, time, times: [time]})
    }
  }

  const handleKeyframeSelect = (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    extend: boolean,
  ) => {
    const parameterId = track.parameter.id
    setActiveParameterId(parameterId)
    setSelection((current) => updateKeyframeSelection(current, parameterId, keyframe.time, extend))
    props.onSeek?.(keyframe.time)
  }

  const updateKeyframeTimes = (move: MoveParameterKeyframesTarget) => {
    return applyDocumentChange(
      props.onDocumentChange,
      moveParameterKeyframes({document: props.document, ...move}),
    )
  }

  const handleKeyframeMove = (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    time: number,
  ) => {
    const activeMotion = motion()
    const parameterId = track.parameter.id
    const currentSelection = selection()
    const selectedTimes = isKeyframeSelected(currentSelection, parameterId, keyframe.time)
      ? currentSelection!.times
      : [keyframe.time]

    if (
      activeMotion === undefined ||
      !updateKeyframeTimes({
        motionId: activeMotion.id,
        nextTime: time,
        parameterId,
        time: keyframe.time,
        times: selectedTimes,
      })
    ) {
      return
    }

    const timeOffset = time - keyframe.time
    setActiveParameterId(parameterId)
    setSelection({
      parameterId,
      time,
      times: selectedTimes.map((selectedTime) => selectedTime + timeOffset),
    })
    props.onSeek?.(time)
  }

  const handleKeyframeAdd = (motionId: string | undefined, parameterId: string, time: number) =>
    motionId !== undefined &&
    applyDocumentChange(
      props.onDocumentChange,
      insertParameterKeyframe({
        document: props.document,
        motionId,
        parameterId,
        parameterValues: props.parameterValues,
        time,
      }),
    )
  const handleTrackKeyframesDelete = (
    track: ParameterTimelineTrack,
    times: ReadonlyArray<number>,
  ) => {
    const activeMotion = motion()
    if (
      activeMotion === undefined ||
      !deleteKeyframes(activeMotion.id, track.parameter.id, times)
    ) {
      return false
    }
    setSelection(null)
    return true
  }

  const deleteKeyframes = (motionId: string, parameterId: string, times: ReadonlyArray<number>) => {
    return applyDocumentChange(
      props.onDocumentChange,
      deleteTimelineKeyframes({document: props.document, motionId, parameterId, times}),
    )
  }

  const updateKeyframesEasing = (
    motionId: string,
    parameterId: string,
    times: ReadonlyArray<number>,
    easing: PuppetEasing,
  ) => {
    return applyDocumentChange(
      props.onDocumentChange,
      setParameterKeyframesEasing({
        document: props.document,
        easing,
        motionId,
        parameterId,
        times,
      }),
    )
  }

  const handleEasingChange = (value: string) => {
    const document = easeSelectedKeyframes({
      document: props.document,
      motion: motion(),
      selection: selection(),
      value,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }

  return (
    <section class="timeline" aria-labelledby={titleId}>
      <Show
        when={allMotionsVisible()}
        fallback={
          <>
            <TimelineToolbar
              easing={(selectedKeyframe()?.easing ?? 'linear') satisfies PuppetEasing}
              framesPerSecond={framesPerSecond()}
              hasEditableSelection={hasEditableSelection(
                selectedKeyframe(),
                props.onDocumentChange,
              )}
              isPlaying={props.isPlaying}
              availableParameters={parameterRows.available()}
              motionIds={motionOptions()}
              motionId={motion()?.id}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onFramesPerSecondChange={getAvailableAction(
                props.onDocumentChange,
                handleFramesPerSecondChange,
              )}
              onMotionAdd={getAvailableAction(props.onDocumentChange, motionActions.add)}
              onMotionChange={handleViewChange}
              onMotionDelete={getAvailableAction(props.onDocumentChange, motionActions.delete)}
              onMotionDuplicate={getAvailableAction(
                props.onDocumentChange,
                motionActions.duplicate,
              )}
              onMotionRename={getAvailableAction(props.onDocumentChange, motionActions.rename)}
              onParameterAdd={getAvailableAction(props.onDocumentChange, parameterRows.add)}
              onEasingChange={handleEasingChange}
              onPlaybackToggle={props.onPlaybackToggle}
              titleId={titleId}
            />
            <TimelineDopesheet
              currentTime={currentTime()}
              duration={duration()}
              framesPerSecond={framesPerSecond()}
              motion={motion()}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onKeyframeAdd={getAvailableAction(props.onDocumentChange, (track, time) =>
                handleKeyframeAdd(motion()?.id, track.parameter.id, time),
              )}
              onKeyframesDelete={getAvailableAction(
                props.onDocumentChange,
                handleTrackKeyframesDelete,
              )}
              onKeyframeSelect={handleKeyframeSelect}
              onKeyframeMove={getAvailableAction(props.onDocumentChange, handleKeyframeMove)}
              onParameterValueChange={(track, value) =>
                updateParameterKeyframe(track.parameter.id, value)
              }
              onParameterSelect={handleParameterSelect}
              onParameterRemove={getAvailableAction(
                props.onDocumentChange,
                parameterRows.removeActive,
              )}
              onSeek={handleSeek}
              rulerLabel={
                <Show when={motion()} fallback="Parameter">
                  {(activeMotion) => (
                    <div class="timeline-motion-group-heading">
                      <TimelineMotionName
                        motionId={activeMotion().id}
                        motionIds={motionIds()}
                        onDelete={getAvailableAction(props.onDocumentChange, motionActions.delete)}
                        onRename={getAvailableAction(props.onDocumentChange, motionActions.rename)}
                      >
                        <TimelineSettingsControls
                          duration={activeMotion().duration}
                          durationMinimum={activeMinimumDuration()}
                          framesPerSecond={framesPerSecond()}
                          onDurationChange={getAvailableAction(
                            props.onDocumentChange,
                            handleActiveDurationChange,
                          )}
                          onEditEnd={props.onEditEnd}
                          onEditStart={props.onEditStart}
                          showDurationLabel={false}
                          showFramesPerSecond={false}
                        />
                      </TimelineMotionName>
                    </div>
                  )}
                </Show>
              }
              rulerStatus={
                <>
                  {getFrame(currentTime(), framesPerSecond())}f /{' '}
                  {getFrame(duration(), framesPerSecond())}f · {currentTime().toFixed(2)}s
                </>
              }
              selectedParameterId={activeParameterId()}
              selection={selection()}
              tracks={parameterTracks()}
              values={parameterValues()}
            />
          </>
        }
      >
        <AllMotionTimeline
          document={props.document}
          framesPerSecond={framesPerSecond()}
          getCurrentTime={getMotionTime}
          onDurationChange={getAvailableAction(props.onDocumentChange, handleDurationChange)}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onFramesPerSecondChange={getAvailableAction(
            props.onDocumentChange,
            handleFramesPerSecondChange,
          )}
          onKeyframeAdd={getAvailableAction(props.onDocumentChange, handleKeyframeAdd)}
          onKeyframesDelete={getAvailableAction(props.onDocumentChange, deleteKeyframes)}
          onKeyframesEasingChange={getAvailableAction(
            props.onDocumentChange,
            updateKeyframesEasing,
          )}
          onMotionAdd={getAvailableAction(props.onDocumentChange, motionActions.add)}
          onMotionDelete={getAvailableAction(props.onDocumentChange, motionActions.deleteById)}
          onKeyframeMove={getAvailableAction(props.onDocumentChange, updateKeyframeTimes)}
          onMotionSeek={getMotionSeekAction(
            props.onMotionSeek,
            props.onMotionChange,
            props.onSeek,
            handleMotionSeek,
          )}
          onMotionRename={getAvailableAction(props.onDocumentChange, motionActions.renameById)}
          onParameterRemove={getAvailableAction(props.onDocumentChange, parameterRows.remove)}
          onViewChange={handleViewChange}
          parameterValues={props.parameterValues}
          titleId={titleId}
        />
      </Show>
    </section>
  )
}
