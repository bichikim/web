import {
  EditorButton,
  EditorDiamondButton,
  EditorNumberField,
  EditorSelect,
} from '../../design-system'
import {Slider} from '@kobalte/core/slider'
import {sortBy} from 'es-toolkit/array'
import {clamp} from 'es-toolkit/math'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Index,
  on,
  Show,
} from 'solid-js'

import {getDefaultParameterValueMap, type PuppetParameterValueMap} from '../../deformation'
import {
  PUPPET_EASINGS,
  type PuppetDocument,
  type PuppetEasing,
  type PuppetMotion,
  type PuppetParameter,
} from '../../player/document'
import {sampleMotionParameterValues} from '../../player/internal/motion'
import {
  deleteParameterKeyframe,
  setParameterKeyframe,
  setParameterKeyframeEasing,
} from './motion-keyframes'

const PERCENT = 100
const RULER_INTERVAL_COUNT = 8
const FRAMES_PER_SECOND = 24

interface KeyframeSelection {
  readonly parameterId: string
  readonly time: number
}

interface SelectedKeyframe {
  readonly easing: PuppetEasing
  readonly hasNext: boolean
}

interface ParameterTimelineKeyframe {
  readonly easing: PuppetEasing
  readonly time: number
}

interface ParameterTimelineTrack {
  readonly keyframes: ReadonlyArray<ParameterTimelineKeyframe>
  readonly parameter: PuppetParameter
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
  readonly onPlaybackToggle?: () => void
  readonly onSeek?: (time: number) => void
  readonly parameterValues?: PuppetParameterValueMap
}

const isSameSelection = (selection: KeyframeSelection | null, target: KeyframeSelection) =>
  selection?.parameterId === target.parameterId && selection.time === target.time

const getParameterTracks = (
  document: PuppetDocument,
  motion: PuppetMotion | undefined,
): ReadonlyArray<ParameterTimelineTrack> =>
  (document.parameters ?? []).map((parameter) => {
    const track = motion?.tracks.find(
      (candidate) => candidate.kind === 'parameter' && candidate.parameterId === parameter.id,
    )

    return {
      keyframes: sortBy(track?.keyframes ?? [], ['time']).map((keyframe) => ({
        easing: keyframe.easing ?? 'linear',
        time: keyframe.time,
      })),
      parameter,
    }
  })

const getActiveMotion = (document: PuppetDocument, motionId: string | undefined) =>
  document.motions.find((motion) => motion.id === motionId) ?? document.motions[0]

const getFrame = (time: number) => Math.round(time * FRAMES_PER_SECOND)

const snapToFrame = (time: number, duration: number) =>
  Math.min(getFrame(time) / FRAMES_PER_SECOND, duration)

const getTimelineTime = (event: MouseEvent, duration: number) => {
  const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
  const position = bounds.width === 0 ? 0 : (event.clientX - bounds.left) / bounds.width

  return snapToFrame(clamp(position, 0, 1) * duration, duration)
}

const getKeyframeSelectionAtTime = (
  tracks: ReadonlyArray<ParameterTimelineTrack>,
  time: number,
  selectedParameterId: string | null,
): KeyframeSelection | null => {
  if (selectedParameterId === null) {
    return null
  }

  const matchesTime = (keyframe: ParameterTimelineKeyframe) =>
    getFrame(keyframe.time) === getFrame(time)
  const track = tracks.find((candidate) => candidate.parameter.id === selectedParameterId)
  const keyframe = track?.keyframes.find(matchesTime)

  return track === undefined || keyframe === undefined
    ? null
    : {parameterId: track.parameter.id, time: keyframe.time}
}

const getSelectedKeyframe = (
  selection: KeyframeSelection | null,
  tracks: ReadonlyArray<ParameterTimelineTrack>,
): SelectedKeyframe | null => {
  if (selection === null) {
    return null
  }

  const track = tracks.find((candidate) => candidate.parameter.id === selection.parameterId)
  const keyframeIndex = track?.keyframes.findIndex((keyframe) => keyframe.time === selection.time)
  const keyframe = keyframeIndex === undefined ? undefined : track?.keyframes[keyframeIndex]

  return track === undefined || keyframe === undefined || keyframeIndex === undefined
    ? null
    : {easing: keyframe.easing, hasNext: keyframeIndex < track.keyframes.length - 1}
}

interface DeleteKeyframeOptions {
  readonly document: PuppetDocument
  readonly motion?: PuppetMotion
  readonly selection: KeyframeSelection | null
}

const getDeletedKeyframeDocument = (options: DeleteKeyframeOptions) => {
  if (options.motion === undefined || options.selection === null) {
    return undefined
  }

  return deleteParameterKeyframe({
    ...options.selection,
    document: options.document,
    motionId: options.motion.id,
  })
}

interface EasingChangeOptions {
  readonly document: PuppetDocument
  readonly motion?: PuppetMotion
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly selection: KeyframeSelection | null
  readonly value: string
}

const updateSelectedKeyframeEasing = (options: EasingChangeOptions) => {
  const easing = PUPPET_EASINGS.find((candidate) => candidate === options.value)
  const {onDocumentChange} = options

  if (
    options.motion === undefined ||
    options.selection === null ||
    easing === undefined ||
    onDocumentChange === undefined
  ) {
    return
  }

  const document = setParameterKeyframeEasing({
    ...options.selection,
    document: options.document,
    easing,
    motionId: options.motion.id,
  })

  if (document !== undefined) {
    onDocumentChange(document)
  }
}

interface TimelineToolbarProps {
  readonly canAddKeyframe: boolean
  readonly canDeleteKeyframe: boolean
  readonly currentTime: number
  readonly duration: number
  readonly easing: PuppetEasing
  readonly hasEditableSelection: boolean
  readonly isPlaying?: boolean
  readonly motionIds: ReadonlyArray<string>
  readonly motionId?: string
  readonly onMotionChange?: (motionId: string) => void
  readonly onEasingChange?: (value: string) => void
  readonly onKeyframeAdd?: () => void
  readonly onKeyframeDelete?: () => void
  readonly onPlaybackToggle?: () => void
  readonly titleId: string
}

const TimelineToolbar = (props: TimelineToolbarProps) => (
  <header class="timeline-toolbar">
    <div class="timeline-label">
      <span>Timeline</span>
      <strong id={props.titleId}>{props.motionId ?? 'Static mesh'}</strong>
    </div>
    <div class="timeline-actions">
      <div class="timeline-motion-controls">
        <EditorSelect
          label="모션 선택"
          options={props.motionIds}
          value={props.motionId}
          disabled={props.motionIds.length === 0 || props.onMotionChange === undefined}
          onChange={props.onMotionChange}
        />
      </div>
      <EditorButton
        class="timeline-playback"
        disabled={props.motionId === undefined || props.onPlaybackToggle === undefined}
        type="button"
        onClick={() => props.onPlaybackToggle?.()}
      >
        {props.isPlaying === false ? '재생' : '정지'}
      </EditorButton>
      <EditorButton
        class="timeline-keyframe-add"
        disabled={!props.canAddKeyframe || props.onKeyframeAdd === undefined}
        type="button"
        onClick={() => props.onKeyframeAdd?.()}
      >
        <span aria-hidden="true" class="puppet-icon puppet-icon-plus" /> 현재 위치에 키프레임
      </EditorButton>
      <EditorButton
        class="timeline-keyframe-delete"
        disabled={!props.canDeleteKeyframe || props.onKeyframeDelete === undefined}
        type="button"
        onClick={() => props.onKeyframeDelete?.()}
      >
        선택 키프레임 삭제
      </EditorButton>
      <label class="timeline-easing">
        <span>다음 키프레임까지</span>
        <EditorSelect
          label="키프레임 이징"
          disabled={!props.hasEditableSelection || props.onEasingChange === undefined}
          value={props.easing}
          options={['linear', 'ease-in', 'ease-out', 'ease-in-out']}
          onChange={(value) => props.onEasingChange?.(value)}
        />
      </label>
    </div>
    <span class="timeline-time">
      {getFrame(props.currentTime)}f / {getFrame(props.duration)}f · {props.currentTime.toFixed(2)}s
    </span>
  </header>
)

interface TimelineDopesheetProps {
  readonly currentTime: number
  readonly duration: number
  readonly motion?: PuppetMotion
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onKeyframeSelect?: (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
  ) => void
  readonly onParameterValueChange?: (track: ParameterTimelineTrack, value: number) => void
  readonly onParameterSelect?: (parameterId: string) => void
  readonly onSeek?: (time: number, preferredParameterId?: string) => void
  readonly selectedParameterId?: string | null
  readonly selection: KeyframeSelection | null
  readonly tracks: ReadonlyArray<ParameterTimelineTrack>
  readonly values: Readonly<Record<string, number>>
}

const TimelineDopesheet = (props: TimelineDopesheetProps) => {
  const progress = () => (props.duration === 0 ? 0 : (props.currentTime / props.duration) * PERCENT)
  const handleTrackClick = (event: MouseEvent, parameterId: string) => {
    props.onParameterSelect?.(parameterId)
    props.onSeek?.(getTimelineTime(event, props.duration), parameterId)
  }
  const rulerTimes = createMemo(() => {
    const timelineDuration = props.duration
    return Array.from(
      {length: RULER_INTERVAL_COUNT + 1},
      (_, index) => (timelineDuration * index) / RULER_INTERVAL_COUNT,
    )
  })

  return (
    <div
      class="timeline-dopesheet"
      style={{'--timeline-frame-count': Math.max(1, getFrame(props.duration))}}
    >
      <div class="timeline-ruler-label">Parameter</div>
      <div class="timeline-ruler">
        <For each={rulerTimes()}>
          {(time) => (
            <span
              style={{left: `${props.duration === 0 ? 0 : (time / props.duration) * PERCENT}%`}}
            >
              {getFrame(time)}f
            </span>
          )}
        </For>
        <span aria-hidden="true" class="timeline-ruler-playhead" style={{left: `${progress()}%`}} />
        <Slider
          class="timeline-seek"
          minValue={0}
          maxValue={Math.max(1 / FRAMES_PER_SECOND, props.duration)}
          step={1 / FRAMES_PER_SECOND}
          value={[props.currentTime]}
          disabled={props.motion === undefined || props.onSeek === undefined}
          onChange={(values) => props.onSeek?.(values[0]!)}
        >
          <Slider.Track class="timeline-seek-track">
            <Slider.Thumb
              class="timeline-seek-thumb"
              aria-label="재생 위치"
              aria-disabled={props.motion === undefined || props.onSeek === undefined}
            >
              <Slider.Input />
            </Slider.Thumb>
          </Slider.Track>
        </Slider>
      </div>

      <Show
        when={props.tracks.length > 0}
        fallback={<p class="timeline-empty">Parameter가 없습니다.</p>}
      >
        <Index each={props.tracks}>
          {(track) => {
            const parameterId = () => track().parameter.id
            const parameterName = () => track().parameter.name

            return (
              <>
                <div
                  class="timeline-row-label"
                  data-selected={props.selectedParameterId === parameterId() ? '' : undefined}
                  onClick={() => props.onParameterSelect?.(parameterId())}
                >
                  <strong>{parameterName()}</strong>
                  <EditorNumberField
                    disabled={
                      props.motion === undefined || props.onParameterValueChange === undefined
                    }
                    label={`${parameterName()} 현재 값`}
                    maximum={track().parameter.maximum}
                    minimum={track().parameter.minimum}
                    step="any"
                    value={props.values[parameterId()] ?? track().parameter.defaultValue}
                    onEditEnd={props.onEditEnd}
                    onEditStart={() => {
                      props.onParameterSelect?.(parameterId())
                      props.onEditStart?.()
                    }}
                    onValueChange={(value) => props.onParameterValueChange?.(track(), value)}
                  />
                </div>
                <div
                  class="timeline-row"
                  aria-label={`${parameterName()} 트랙`}
                  data-selected={props.selectedParameterId === parameterId() ? '' : undefined}
                  onClick={(event) => handleTrackClick(event, parameterId())}
                >
                  <For each={track().keyframes}>
                    {(keyframe) => {
                      const target = {parameterId: parameterId(), time: keyframe.time}

                      return (
                        <EditorDiamondButton
                          aria-label={`${parameterName()} ${keyframe.time.toFixed(2)}초 키프레임`}
                          aria-pressed={isSameSelection(props.selection, target)}
                          class="timeline-keyframe"
                          style={{
                            left: `${props.duration === 0 ? 0 : (keyframe.time / props.duration) * PERCENT}%`,
                          }}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            props.onKeyframeSelect?.(track(), keyframe)
                          }}
                        />
                      )
                    }}
                  </For>
                  <span
                    aria-hidden="true"
                    class="timeline-row-playhead"
                    style={{left: `${progress()}%`}}
                  />
                </div>
              </>
            )
          }}
        </Index>
      </Show>
    </div>
  )
}

// eslint-disable-next-line max-lines-per-function
export const EditorTimeline = (props: EditorTimelineProps) => {
  const titleId = createUniqueId()
  const [selection, setSelection] = createSignal<KeyframeSelection | null>(null)
  const [activeParameterId, setActiveParameterId] = createSignal<string | null>(null)
  const motion = () => getActiveMotion(props.document, props.motionId)
  const duration = () => motion()?.duration ?? 0
  const currentTime = () => clamp(props.currentTime ?? 0, 0, duration())
  const parameterTracks = createMemo(() => getParameterTracks(props.document, motion()))
  const parameterValues = createMemo(() =>
    sampleMotionParameterValues({
      motion: motion(),
      parameterValues: props.parameterValues ?? getDefaultParameterValueMap(props.document),
      time: currentTime(),
    }),
  )
  const selectedKeyframe = createMemo(() => getSelectedKeyframe(selection(), parameterTracks()))

  const handleParameterSelect = (parameterId: string) => {
    setActiveParameterId(parameterId)
    setSelection(getKeyframeSelectionAtTime(parameterTracks(), currentTime(), parameterId))
  }

  const handleSeek = (time: number, parameterId?: string) => {
    const selectedParameterId = parameterId ?? activeParameterId()
    const nextSelection = getKeyframeSelectionAtTime(parameterTracks(), time, selectedParameterId)

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
        setSelection(
          getKeyframeSelectionAtTime(
            parameterTracks(),
            clamp(time ?? 0, 0, duration()),
            activeParameterId(),
          ),
        )
      },
    ),
  )

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

    const time = snapToFrame(currentTime(), activeMotion.duration)
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
      setSelection({parameterId, time})
    }
  }

  const handleKeyframeSelect = (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
  ) => {
    const parameterId = track.parameter.id
    handleSeek(keyframe.time, parameterId)
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

    const document = getDeletedKeyframeDocument({
      document: props.document,
      motion: motion(),
      selection: selection(),
    })

    if (document !== undefined) {
      props.onDocumentChange(document)
      setSelection(null)
    }
  }

  const handleEasingChange = (value: string) => {
    updateSelectedKeyframeEasing({
      document: props.document,
      motion: motion(),
      onDocumentChange: props.onDocumentChange,
      selection: selection(),
      value,
    })
  }

  return (
    <section class="timeline" aria-labelledby={titleId}>
      <TimelineToolbar
        canAddKeyframe={
          motion() !== undefined &&
          parameterTracks().length > 0 &&
          props.onDocumentChange !== undefined
        }
        canDeleteKeyframe={selectedKeyframe() !== null && props.onDocumentChange !== undefined}
        currentTime={currentTime()}
        duration={duration()}
        easing={(selectedKeyframe()?.easing ?? 'linear') satisfies PuppetEasing}
        hasEditableSelection={
          selectedKeyframe()?.hasNext === true && props.onDocumentChange !== undefined
        }
        isPlaying={props.isPlaying}
        motionIds={props.document.motions.map((candidate) => candidate.id)}
        motionId={motion()?.id}
        onMotionChange={props.onMotionChange}
        onEasingChange={handleEasingChange}
        onKeyframeAdd={handleKeyframeAdd}
        onKeyframeDelete={handleKeyframeDelete}
        onPlaybackToggle={props.onPlaybackToggle}
        titleId={titleId}
      />
      <TimelineDopesheet
        currentTime={currentTime()}
        duration={duration()}
        motion={motion()}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onKeyframeSelect={handleKeyframeSelect}
        onParameterValueChange={(track, value) =>
          updateParameterKeyframe(track.parameter.id, value)
        }
        onParameterSelect={handleParameterSelect}
        onSeek={handleSeek}
        selectedParameterId={activeParameterId()}
        selection={selection()}
        tracks={parameterTracks()}
        values={parameterValues()}
      />
    </section>
  )
}
