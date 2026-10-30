import {Slider} from '@kobalte/core/slider'
import {For, type JSX, Show} from 'solid-js'
import type {PuppetMotion} from '../../player/document'
import {getFrame} from './timeline-keyframe-selection'

const PERCENT = 100

const getSliderMaximum = (duration: number, framesPerSecond: number) =>
  Math.max(1 / framesPerSecond, Math.ceil(duration * framesPerSecond) / framesPerSecond)

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

export const TimelineRuler = (props: TimelineRulerProps) => (
  <div class="timeline-ruler">
    <For each={props.rulerTimes}>
      {(time) => (
        <span
          data-end={time === props.duration}
          style={{left: `${props.duration === 0 ? 0 : (time / props.duration) * PERCENT}%`}}
        >
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
