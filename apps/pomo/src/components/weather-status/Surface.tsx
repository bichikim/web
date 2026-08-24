import {cx} from 'class-variance-authority'
import {type JSX} from 'solid-js'
import type {PSceneStyle} from '../../features/focus-room-animation/index'
import {PScribblePanel} from '../PScribblePanel'

const STATUS_CLASS = [
  'pomo-weather-status inline-flex min-h-8 w-full items-center gap-2',
  'bg-surface px-3 py-1 text-xs font-650 leading-5 text-foreground shadow-panel',
  'backdrop-blur-surface',
].join(' ')

interface WeatherStatusSurfaceProps {
  readonly children: JSX.Element
  readonly sceneStyle?: PSceneStyle
}

const getWeatherStatusShapeClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble'
    ? 'rounded-none border-0'
    : 'rounded-control border border-solid border-border'

export const WeatherStatusSurface = (props: WeatherStatusSurfaceProps) => (
  <PScribblePanel
    class="pomo-weather-status-frame inline-flex"
    enabled={props.sceneStyle === 'scribble'}
    frameClass="pomo-weather-status__scribble-border"
  >
    <span
      aria-live="polite"
      class={cx(STATUS_CLASS, getWeatherStatusShapeClasses(props.sceneStyle))}
      role="status"
    >
      {props.children}
    </span>
  </PScribblePanel>
)
