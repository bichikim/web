import {sortBy} from 'es-toolkit/array'
import {clamp} from 'es-toolkit/math'
import {createMemo, createSignal, createUniqueId, For, Show} from 'solid-js'

import {
  PUPPET_EASINGS,
  type PuppetDocument,
  type PuppetEasing,
  type PuppetMotion,
} from '../../player/document'
import {
  deleteVertexKeyframe,
  insertVertexKeyframe,
  setVertexKeyframeEasing,
} from './motion-keyframes'

const PERCENT = 100
const RULER_INTERVAL_COUNT = 8
const FRAMES_PER_SECOND = 24

interface KeyframeSelection {
  readonly partId: string
  readonly time: number
  readonly vertexIndex: number
}

interface SelectedKeyframe {
  readonly easing: PuppetEasing
  readonly hasNext: boolean
}

interface VertexTimelineKeyframe {
  readonly easing: PuppetEasing
  readonly time: number
}

interface VertexTimelineTrack {
  readonly keyframes: ReadonlyArray<VertexTimelineKeyframe>
  readonly partId: string
  readonly vertexIndex: number
}

export interface EditorTimelineProps {
  readonly activePartId?: string
  readonly activeVertexIndex?: number | null
  readonly currentTime?: number
  readonly document: PuppetDocument
  readonly isPlaying?: boolean
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onPlaybackToggle?: () => void
  readonly onSeek?: (time: number) => void
  readonly onTargetSelect?: (partId: string, vertexIndex: number) => void
}

const isSameSelection = (selection: KeyframeSelection | null, target: KeyframeSelection) =>
  selection?.partId === target.partId &&
  selection.time === target.time &&
  selection.vertexIndex === target.vertexIndex

const getTrackLabel = (track: VertexTimelineTrack) =>
  `${track.partId} 정점 ${track.vertexIndex + 1}`

const getVertexTracks = (motion: PuppetMotion | undefined): ReadonlyArray<VertexTimelineTrack> => {
  const trackByTarget = new Map<
    string,
    {keyframes: Map<number, PuppetEasing>; partId: string; vertexIndex: number}
  >()

  for (const track of motion?.tracks ?? []) {
    const key = `${track.partId}:${track.vertexIndex}`
    const vertexTrack = trackByTarget.get(key) ?? {
      keyframes: new Map<number, PuppetEasing>(),
      partId: track.partId,
      vertexIndex: track.vertexIndex,
    }

    for (const keyframe of track.keyframes) {
      if (!vertexTrack.keyframes.has(keyframe.time)) {
        vertexTrack.keyframes.set(keyframe.time, keyframe.easing ?? 'linear')
      }
    }

    trackByTarget.set(key, vertexTrack)
  }

  return [...trackByTarget.values()].map((track) => ({
    keyframes: sortBy([...track.keyframes], [(keyframe) => keyframe[0]]).map(([time, easing]) => ({
      easing,
      time,
    })),
    partId: track.partId,
    vertexIndex: track.vertexIndex,
  }))
}

const getFrame = (time: number) => Math.round(time * FRAMES_PER_SECOND)

const snapToFrame = (time: number, duration: number) =>
  Math.min(getFrame(time) / FRAMES_PER_SECOND, duration)

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
  readonly onKeyframeSelect?: (track: VertexTimelineTrack, keyframe: VertexTimelineKeyframe) => void
  readonly onSeek?: (time: number) => void
  readonly selection: KeyframeSelection | null
  readonly tracks: ReadonlyArray<VertexTimelineTrack>
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
      <div class="timeline-ruler-label">레이어 / 속성</div>
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
        fallback={<p class="timeline-empty">애니메이션 트랙이 없습니다.</p>}
      >
        <For each={props.tracks}>
          {(track) => (
            <>
              <div class="timeline-row-label">
                <span>{track.partId}</span>
                <strong>정점 {track.vertexIndex + 1}</strong>
              </div>
              <div class="timeline-row" aria-label={`${getTrackLabel(track)} 트랙`}>
                <For each={track.keyframes}>
                  {(keyframe) => {
                    const target = {
                      partId: track.partId,
                      time: keyframe.time,
                      vertexIndex: track.vertexIndex,
                    }

                    return (
                      <button
                        aria-label={`${getTrackLabel(track)} ${keyframe.time.toFixed(2)}초 키프레임`}
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
  const motion = () => props.document.motions[0]
  const duration = () => motion()?.duration ?? 0
  const currentTime = () => clamp(props.currentTime ?? 0, 0, duration())
  const vertexTracks = createMemo(() => getVertexTracks(motion()))
  const selectedKeyframe = createMemo<SelectedKeyframe | null>(() => {
    const activeSelection = selection()

    if (activeSelection === null) {
      return null
    }

    const track = vertexTracks().find(
      (candidate) =>
        candidate.partId === activeSelection.partId &&
        candidate.vertexIndex === activeSelection.vertexIndex,
    )
    const keyframeIndex = track?.keyframes.findIndex(
      (keyframe) => keyframe.time === activeSelection.time,
    )
    const keyframe = keyframeIndex === undefined ? undefined : track?.keyframes[keyframeIndex]

    return track === undefined || keyframe === undefined || keyframeIndex === undefined
      ? null
      : {easing: keyframe.easing, hasNext: keyframeIndex < track.keyframes.length - 1}
  })

  const handleKeyframeSelect = (track: VertexTimelineTrack, keyframe: VertexTimelineKeyframe) => {
    setSelection({
      partId: track.partId,
      time: keyframe.time,
      vertexIndex: track.vertexIndex,
    })
    props.onTargetSelect?.(track.partId, track.vertexIndex)
    props.onSeek?.(keyframe.time)
  }

  const handleKeyframeAdd = () => {
    const activeMotion = motion()
    const partId = props.activePartId
    const vertexIndex = props.activeVertexIndex

    if (
      activeMotion === undefined ||
      partId === undefined ||
      vertexIndex === undefined ||
      vertexIndex === null ||
      props.onDocumentChange === undefined
    ) {
      return
    }

    const time = snapToFrame(currentTime(), activeMotion.duration)
    const document = insertVertexKeyframe({
      document: props.document,
      motionId: activeMotion.id,
      partId,
      time,
      vertexIndex,
    })

    if (document !== undefined) {
      props.onDocumentChange(document)
      setSelection({partId, time, vertexIndex})
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

    const document = deleteVertexKeyframe({
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

    const document = setVertexKeyframeEasing({
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
          props.activePartId !== undefined &&
          props.activeVertexIndex !== undefined &&
          props.activeVertexIndex !== null &&
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
        onSeek={props.onSeek}
        selection={selection()}
        tracks={vertexTracks()}
      />
    </section>
  )
}
