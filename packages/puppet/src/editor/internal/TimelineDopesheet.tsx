import {Slider} from '@kobalte/core/slider'
import {clamp} from 'es-toolkit/math'
import {createMemo, For, Index, type JSX, Show} from 'solid-js'

import {DEFAULT_PUPPET_FRAMES_PER_SECOND, type PuppetMotion} from '../../player/document'
import {
  getFrame,
  isKeyframeSelected,
  type KeyframeSelection,
  type ParameterTimelineKeyframe,
  type ParameterTimelineTrack,
  snapToFrame,
} from './timeline-keyframe-selection'
import {TimelineKeyframeMarker} from './TimelineKeyframeMarker'
import {TimelineParameterValueField} from './TimelineParameterValueField'
import {useTimelineKeyframeMovePreview} from './use-timeline-keyframe-move-preview'

const PERCENT = 100
const RULER_LABEL_FRAME_INTERVAL = 6

const getTimelineTime = (
  clientX: number,
  bounds: DOMRect,
  duration: number,
  framesPerSecond: number,
) => {
  const position = bounds.width === 0 ? 0 : (clientX - bounds.left) / bounds.width

  return snapToFrame(clamp(position, 0, 1) * duration, duration, framesPerSecond)
}

const getSliderMaximum = (duration: number, framesPerSecond: number) =>
  Math.max(1 / framesPerSecond, Math.ceil(duration * framesPerSecond) / framesPerSecond)

export interface TimelineDopesheetProps {
  readonly currentTime: number
  readonly duration: number
  readonly framesPerSecond?: number
  readonly motion?: PuppetMotion
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onKeyframeSelect?: (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    extend: boolean,
  ) => void
  readonly onKeyframeMove?: (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    time: number,
  ) => void
  readonly onParameterValueChange?: (track: ParameterTimelineTrack, value: number) => void
  readonly onParameterSelect?: (parameterId: string) => void
  readonly onSeek?: (time: number, preferredParameterId?: string) => void
  readonly rulerLabel?: JSX.Element
  readonly rulerStatus?: JSX.Element
  readonly selectedParameterId?: string | null
  readonly seekLabel?: string
  readonly selection: KeyframeSelection | null
  readonly tracks: ReadonlyArray<ParameterTimelineTrack>
  readonly values: Readonly<Record<string, number>>
}

interface TimelineRulerProps {
  readonly currentTime: number
  readonly duration: number
  readonly framesPerSecond: number
  readonly motion?: PuppetMotion
  readonly onSeek?: (time: number) => void
  readonly progress: number
  readonly rulerStatus?: JSX.Element
  readonly rulerTimes: ReadonlyArray<number>
  readonly seekLabel?: string
}

const TimelineRuler = (props: TimelineRulerProps) => (
  <div class="timeline-ruler">
    <For each={props.rulerTimes}>
      {(time) => (
        <span style={{left: `${props.duration === 0 ? 0 : (time / props.duration) * PERCENT}%`}}>
          {getFrame(time, props.framesPerSecond)}f
        </span>
      )}
    </For>
    <span aria-hidden="true" class="timeline-ruler-playhead" style={{left: `${props.progress}%`}} />
    <Slider
      class="timeline-seek"
      minValue={0}
      maxValue={getSliderMaximum(props.duration, props.framesPerSecond)}
      step={1 / props.framesPerSecond}
      value={[props.currentTime]}
      disabled={props.motion === undefined || props.onSeek === undefined}
      onChange={(values) => props.onSeek?.(Math.min(values[0]!, props.duration))}
    >
      <Slider.Track class="timeline-seek-track">
        <Slider.Thumb
          class="timeline-seek-thumb"
          aria-label={props.seekLabel ?? '재생 위치'}
          aria-disabled={props.motion === undefined || props.onSeek === undefined}
        >
          <Slider.Input />
        </Slider.Thumb>
      </Slider.Track>
    </Slider>
    <Show when={props.rulerStatus}>
      <output class="timeline-ruler-status">{props.rulerStatus}</output>
    </Show>
  </div>
)

export const TimelineDopesheet = (props: TimelineDopesheetProps) => {
  const movePreview = useTimelineKeyframeMovePreview({
    duration: () => props.duration,
    selection: () => props.selection,
  })
  const framesPerSecond = () => props.framesPerSecond ?? DEFAULT_PUPPET_FRAMES_PER_SECOND
  const progress = () => (props.duration === 0 ? 0 : (props.currentTime / props.duration) * PERCENT)
  const handleTrackClick = (event: MouseEvent, parameterId: string) => {
    props.onParameterSelect?.(parameterId)
    props.onSeek?.(
      getTimelineTime(
        event.clientX,
        (event.currentTarget as HTMLDivElement).getBoundingClientRect(),
        props.duration,
        framesPerSecond(),
      ),
      parameterId,
    )
  }
  const rulerTimes = createMemo(() => {
    const frameCount = Math.max(1, getFrame(props.duration, framesPerSecond()))
    const intervalFrames = Array.from(
      {length: Math.floor(frameCount / RULER_LABEL_FRAME_INTERVAL) + 1},
      (_, index) => index * RULER_LABEL_FRAME_INTERVAL,
    )

    return (
      intervalFrames.at(-1) === frameCount ? intervalFrames : [...intervalFrames, frameCount]
    ).map((frame) => frame / framesPerSecond())
  })

  return (
    <div
      aria-label="키프레임 타임라인"
      class="timeline-dopesheet"
      role="group"
      style={{'--timeline-frame-count': Math.max(1, getFrame(props.duration, framesPerSecond()))}}
    >
      <Show
        when={props.tracks.length > 0}
        fallback={<p class="timeline-empty">Parameter가 없습니다.</p>}
      >
        <div class="timeline-labels">
          <div class="timeline-ruler-label">{props.rulerLabel ?? 'Parameter'}</div>
          <Index each={props.tracks}>
            {(track) => {
              const parameterId = () => track().parameter.id
              const parameterName = () => track().parameter.name

              return (
                <div
                  class="timeline-row-label"
                  data-selected={props.selectedParameterId === parameterId() ? '' : undefined}
                  onClick={() => props.onParameterSelect?.(parameterId())}
                >
                  <strong>{parameterName()}</strong>
                  <TimelineParameterValueField
                    disabled={
                      props.motion === undefined || props.onParameterValueChange === undefined
                    }
                    parameter={track().parameter}
                    value={props.values[parameterId()]}
                    onEditEnd={props.onEditEnd}
                    onEditStart={() => {
                      props.onParameterSelect?.(parameterId())
                      props.onEditStart?.()
                    }}
                    onValueChange={(value) => props.onParameterValueChange?.(track(), value)}
                  />
                </div>
              )
            }}
          </Index>
        </div>
        <div class="timeline-tracks-scroll">
          <div class="timeline-tracks">
            <TimelineRuler
              currentTime={props.currentTime}
              duration={props.duration}
              framesPerSecond={framesPerSecond()}
              motion={props.motion}
              progress={progress()}
              rulerStatus={props.rulerStatus}
              rulerTimes={rulerTimes()}
              seekLabel={props.seekLabel}
              onSeek={props.onSeek}
            />
            <Index each={props.tracks}>
              {(track) => {
                const parameterId = () => track().parameter.id
                const parameterName = () => track().parameter.name

                return (
                  <div
                    class="timeline-row"
                    aria-label={`${parameterName()} 트랙`}
                    data-selected={props.selectedParameterId === parameterId() ? '' : undefined}
                    onClick={(event) => handleTrackClick(event, parameterId())}
                  >
                    <For each={track().keyframes}>
                      {(keyframe) => (
                        <TimelineKeyframeMarker
                          duration={props.duration}
                          framesPerSecond={framesPerSecond()}
                          getTime={(clientX, bounds) =>
                            getTimelineTime(clientX, bounds, props.duration, framesPerSecond())
                          }
                          keyframe={keyframe}
                          onEditEnd={props.onEditEnd}
                          onEditStart={props.onEditStart}
                          onMove={props.onKeyframeMove}
                          onMovePreview={movePreview.previewMove}
                          onMovePreviewEnd={movePreview.endPreview}
                          onSelect={props.onKeyframeSelect}
                          parameterName={parameterName()}
                          previewTime={movePreview.getPreviewTime(parameterId(), keyframe)}
                          selected={isKeyframeSelected(
                            props.selection,
                            parameterId(),
                            keyframe.time,
                          )}
                          snapTime={(time) => snapToFrame(time, props.duration, framesPerSecond())}
                          track={track()}
                        />
                      )}
                    </For>
                    <span
                      aria-hidden="true"
                      class="timeline-row-playhead"
                      style={{left: `${progress()}%`}}
                    />
                  </div>
                )
              }}
            </Index>
          </div>
        </div>
      </Show>
    </div>
  )
}
