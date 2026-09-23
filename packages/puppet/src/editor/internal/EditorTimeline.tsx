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
import {ALL_MOTIONS_OPTION, AllMotionTimeline} from './AllMotionTimeline'
import {createTimelineMotionActions} from './create-timeline-motion-actions'
import {editMotion} from './edit-motion'
import {
  deleteParameterKeyframes,
  moveParameterKeyframes,
  type MoveParameterKeyframesTarget,
  setParameterKeyframe,
  setParameterKeyframesEasing,
} from './motion-keyframes'
import {
  deleteSelectedKeyframes,
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

function getEditableAction<Action>(
  onDocumentChange: EditorTimelineProps['onDocumentChange'],
  action: Action,
): Action | undefined {
  return onDocumentChange === undefined ? undefined : action
}

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
  const canSeekAllMotions = () =>
    props.onMotionSeek !== undefined ||
    (props.onMotionChange !== undefined && props.onSeek !== undefined)
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
    motionTimes,
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

  const handleKeyframeAdd = () => {
    const parameterId = activeParameterId() ?? parameterTracks()[0]?.parameter.id
    const value = parameterId === undefined ? undefined : parameterValues()[parameterId]

    if (parameterId !== undefined && value !== undefined) {
      updateParameterKeyframe(parameterId, value)
    }
  }

  const handleKeyframeDelete = () => {
    if (props.onDocumentChange === undefined) {
      return
    }

    const document = deleteSelectedKeyframes({
      document: props.document,
      motion: motion(),
      selection: selection(),
    })

    if (document !== undefined) {
      props.onDocumentChange(document)
      setSelection(null)
    }
  }

  const deleteKeyframes = (motionId: string, parameterId: string, times: ReadonlyArray<number>) => {
    return applyDocumentChange(
      props.onDocumentChange,
      deleteParameterKeyframes({document: props.document, motionId, parameterId, times}),
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
              canAddKeyframe={
                motion() !== undefined &&
                parameterTracks().length > 0 &&
                props.onDocumentChange !== undefined
              }
              canDeleteKeyframe={
                selectedKeyframe() !== null && props.onDocumentChange !== undefined
              }
              easing={(selectedKeyframe()?.easing ?? 'linear') satisfies PuppetEasing}
              framesPerSecond={framesPerSecond()}
              hasEditableSelection={hasEditableSelection(
                selectedKeyframe(),
                props.onDocumentChange,
              )}
              isPlaying={props.isPlaying}
              motionIds={motionOptions()}
              motionId={motion()?.id}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onFramesPerSecondChange={
                props.onDocumentChange === undefined ? undefined : handleFramesPerSecondChange
              }
              onMotionAdd={props.onDocumentChange === undefined ? undefined : motionActions.add}
              onMotionChange={handleViewChange}
              onMotionDelete={
                props.onDocumentChange === undefined ? undefined : motionActions.delete
              }
              onMotionDuplicate={
                props.onDocumentChange === undefined ? undefined : motionActions.duplicate
              }
              onMotionRename={
                props.onDocumentChange === undefined ? undefined : motionActions.rename
              }
              onEasingChange={handleEasingChange}
              onKeyframeAdd={handleKeyframeAdd}
              onKeyframeDelete={handleKeyframeDelete}
              onPlaybackToggle={props.onPlaybackToggle}
              selectedKeyframeCount={selection()?.times.length ?? 0}
              titleId={titleId}
            />
            <TimelineDopesheet
              currentTime={currentTime()}
              duration={duration()}
              framesPerSecond={framesPerSecond()}
              motion={motion()}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onKeyframeSelect={handleKeyframeSelect}
              onKeyframeMove={getEditableAction(props.onDocumentChange, handleKeyframeMove)}
              onParameterValueChange={(track, value) =>
                updateParameterKeyframe(track.parameter.id, value)
              }
              onParameterSelect={handleParameterSelect}
              onSeek={handleSeek}
              rulerLabel={
                <Show when={motion()} fallback="Parameter">
                  {(activeMotion) => (
                    <div class="timeline-motion-group-heading">
                      <TimelineMotionName
                        motionId={activeMotion().id}
                        motionIds={motionIds()}
                        onDelete={getEditableAction(props.onDocumentChange, motionActions.delete)}
                        onRename={getEditableAction(props.onDocumentChange, motionActions.rename)}
                      >
                        <TimelineSettingsControls
                          duration={activeMotion().duration}
                          durationMinimum={activeMinimumDuration()}
                          framesPerSecond={framesPerSecond()}
                          onDurationChange={
                            props.onDocumentChange === undefined
                              ? undefined
                              : handleActiveDurationChange
                          }
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
          onDurationChange={props.onDocumentChange === undefined ? undefined : handleDurationChange}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onFramesPerSecondChange={
            props.onDocumentChange === undefined ? undefined : handleFramesPerSecondChange
          }
          onKeyframesDelete={getEditableAction(props.onDocumentChange, deleteKeyframes)}
          onKeyframesEasingChange={getEditableAction(props.onDocumentChange, updateKeyframesEasing)}
          onMotionAdd={props.onDocumentChange === undefined ? undefined : motionActions.add}
          onMotionDelete={getEditableAction(props.onDocumentChange, motionActions.deleteById)}
          onKeyframeMove={getEditableAction(props.onDocumentChange, updateKeyframeTimes)}
          onMotionSeek={canSeekAllMotions() ? handleMotionSeek : undefined}
          onMotionRename={getEditableAction(props.onDocumentChange, motionActions.renameById)}
          onViewChange={handleViewChange}
          parameterValues={props.parameterValues}
          titleId={titleId}
        />
      </Show>
    </section>
  )
}
