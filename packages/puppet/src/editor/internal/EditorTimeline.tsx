import {sortBy} from 'es-toolkit/array'
import {clamp} from 'es-toolkit/math'
import {createMemo, createSignal, createUniqueId, For, Show} from 'solid-js'

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
  readonly onDocumentChange?: (document: PuppetDocument) => void
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
      (candidate) => 'parameterId' in candidate && candidate.parameterId === parameter.id,
    )

    return {
      keyframes: sortBy(track?.keyframes ?? [], ['time']).map((keyframe) => ({
        easing: keyframe.easing ?? 'linear',
        time: keyframe.time,
      })),
      parameter,
    }
  })

const getFrame = (time: number) => Math.round(time * FRAMES_PER_SECOND)

const snapToFrame = (time: number, duration: number) =>
  Math.min(getFrame(time) / FRAMES_PER_SECOND, duration)

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

interface TimelineToolbarProps {
  readonly canAddKeyframe: boolean
  readonly canDeleteKeyframe: boolean
  readonly currentTime: number
  readonly duration: number
  readonly easing: PuppetEasing
  readonly hasEditableSelection: boolean
  readonly isPlaying?: boolean
  readonly motionId?: string
  readonly onEasingChange?: (event: Event & {readonly currentTarget: HTMLSelectElement}) => void
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
      <button
        class="timeline-playback"
        disabled={props.motionId === undefined || props.onPlaybackToggle === undefined}
        type="button"
        onClick={() => props.onPlaybackToggle?.()}
      >
        {props.isPlaying === false ? '재생' : '정지'}
      </button>
      <button
        class="timeline-keyframe-add"
        disabled={!props.canAddKeyframe || props.onKeyframeAdd === undefined}
        type="button"
        onClick={() => props.onKeyframeAdd?.()}
      >
        + 현재 위치에 키프레임
      </button>
      <button
        class="timeline-keyframe-delete"
        disabled={!props.canDeleteKeyframe || props.onKeyframeDelete === undefined}
        type="button"
        onClick={() => props.onKeyframeDelete?.()}
      >
        선택 키프레임 삭제
      </button>
      <label class="timeline-easing">
        <span>다음 키프레임까지</span>
        <select
          aria-label="키프레임 이징"
          disabled={!props.hasEditableSelection || props.onEasingChange === undefined}
          value={props.easing}
          onChange={(event) => props.onEasingChange?.(event)}
        >
          <option value="linear">Linear</option>
          <option value="ease-in">Ease in</option>
          <option value="ease-out">Ease out</option>
          <option value="ease-in-out">Ease in out</option>
        </select>
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
  readonly onKeyframeSelect?: (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
  ) => void
  readonly onParameterValueChange?: (track: ParameterTimelineTrack, value: number) => void
  readonly onParameterSelect?: (parameterId: string) => void
  readonly onSeek?: (time: number) => void
  readonly selection: KeyframeSelection | null
  readonly tracks: ReadonlyArray<ParameterTimelineTrack>
  readonly values: Readonly<Record<string, number>>
}

const TimelineDopesheet = (props: TimelineDopesheetProps) => {
  const progress = () => (props.duration === 0 ? 0 : (props.currentTime / props.duration) * PERCENT)
  const rulerTimes = createMemo(() => {
    const timelineDuration = props.duration
    return Array.from(
      {length: RULER_INTERVAL_COUNT + 1},
      (_, index) => (timelineDuration * index) / RULER_INTERVAL_COUNT,
    )
  })
  const handleSeek = (event: InputEvent & {readonly currentTarget: HTMLInputElement}) => {
    props.onSeek?.(event.currentTarget.valueAsNumber)
  }

  return (
    <div
      class="timeline-dopesheet"
      style={{'--timeline-frame-count': Math.max(1, getFrame(props.duration))}}
    >
      <div class="timeline-ruler-label">Parameter / 값</div>
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
        <input
          aria-label="재생 위치"
          disabled={props.motion === undefined || props.onSeek === undefined}
          max={props.duration}
          min="0"
          step={1 / FRAMES_PER_SECOND}
          type="range"
          value={props.currentTime}
          onInput={handleSeek}
        />
      </div>

      <Show
        when={props.tracks.length > 0}
        fallback={<p class="timeline-empty">Parameter가 없습니다.</p>}
      >
        <For each={props.tracks}>
          {(track) => (
            <>
              <label class="timeline-row-label">
                <strong>{track.parameter.name}</strong>
                <input
                  aria-label={`${track.parameter.name} 현재 값`}
                  disabled={
                    props.motion === undefined || props.onParameterValueChange === undefined
                  }
                  max={track.parameter.maximum}
                  min={track.parameter.minimum}
                  step="any"
                  type="number"
                  value={props.values[track.parameter.id] ?? track.parameter.defaultValue}
                  onFocus={() => props.onParameterSelect?.(track.parameter.id)}
                  onInput={(event) =>
                    props.onParameterValueChange?.(track, event.currentTarget.valueAsNumber)
                  }
                />
              </label>
              <div class="timeline-row" aria-label={`${track.parameter.name} 트랙`}>
                <For each={track.keyframes}>
                  {(keyframe) => {
                    const target = {parameterId: track.parameter.id, time: keyframe.time}

                    return (
                      <button
                        aria-label={`${track.parameter.name} ${keyframe.time.toFixed(2)}초 키프레임`}
                        aria-pressed={isSameSelection(props.selection, target)}
                        class="timeline-keyframe"
                        style={{
                          left: `${props.duration === 0 ? 0 : (keyframe.time / props.duration) * PERCENT}%`,
                        }}
                        type="button"
                        onClick={() => props.onKeyframeSelect?.(track, keyframe)}
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
          )}
        </For>
      </Show>
    </div>
  )
}

export const EditorTimeline = (props: EditorTimelineProps) => {
  const titleId = createUniqueId()
  const [selection, setSelection] = createSignal<KeyframeSelection | null>(null)
  const [activeParameterId, setActiveParameterId] = createSignal<string | null>(null)
  const motion = () => props.document.motions[0]
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
    setActiveParameterId(parameterId)
    setSelection({parameterId, time: keyframe.time})
    props.onSeek?.(keyframe.time)
  }

  const handleKeyframeAdd = () => {
    const parameterId = activeParameterId() ?? parameterTracks()[0]?.parameter.id
    const value = parameterId === undefined ? undefined : parameterValues()[parameterId]

    if (parameterId !== undefined && value !== undefined) {
      updateParameterKeyframe(parameterId, value)
    }
  }

  const handleKeyframeDelete = () => {
    const activeMotion = motion()
    const activeSelection = selection()

    if (
      activeMotion === undefined ||
      activeSelection === null ||
      props.onDocumentChange === undefined
    ) {
      return
    }

    const document = deleteParameterKeyframe({
      ...activeSelection,
      document: props.document,
      motionId: activeMotion.id,
    })

    if (document !== undefined) {
      props.onDocumentChange(document)
      setSelection(null)
    }
  }

  const handleEasingChange = (event: Event & {readonly currentTarget: HTMLSelectElement}) => {
    const activeMotion = motion()
    const activeSelection = selection()
    const easing = PUPPET_EASINGS.find((candidate) => candidate === event.currentTarget.value)

    if (
      activeMotion === undefined ||
      activeSelection === null ||
      easing === undefined ||
      props.onDocumentChange === undefined
    ) {
      return
    }

    const document = setParameterKeyframeEasing({
      ...activeSelection,
      document: props.document,
      easing,
      motionId: activeMotion.id,
    })

    if (document !== undefined) {
      props.onDocumentChange(document)
    }
  }

  return (
    <section class="timeline" aria-labelledby={titleId}>
      <TimelineToolbar
        canAddKeyframe={
          motion() !== undefined &&
          parameterTracks().length > 0 &&
          props.onDocumentChange !== undefined
        }
        canDeleteKeyframe={selection() !== null && props.onDocumentChange !== undefined}
        currentTime={currentTime()}
        duration={duration()}
        easing={(selectedKeyframe()?.easing ?? 'linear') satisfies PuppetEasing}
        hasEditableSelection={
          selectedKeyframe()?.hasNext === true && props.onDocumentChange !== undefined
        }
        isPlaying={props.isPlaying}
        motionId={motion()?.id}
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
        onKeyframeSelect={handleKeyframeSelect}
        onParameterValueChange={(track, value) =>
          updateParameterKeyframe(track.parameter.id, value)
        }
        onParameterSelect={setActiveParameterId}
        onSeek={props.onSeek}
        selection={selection()}
        tracks={parameterTracks()}
        values={parameterValues()}
      />
    </section>
  )
}
