import {cx} from 'class-variance-authority'
import {type JSX, Match, Show, Switch} from 'solid-js'

import type {PSceneStyle} from '../features/focus-room-animation'
import {getWeatherPresentation, type WeatherState} from '../features/weather'
import {PScribblePanel} from './PScribblePanel'

export interface PWeatherStatusProps {
  readonly sceneStyle?: PSceneStyle
  readonly state: WeatherState
}

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

const WeatherStatusSurface = (props: WeatherStatusSurfaceProps) => (
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

export const PWeatherStatus = (props: PWeatherStatusProps) => (
  <Switch>
    <Match when={props.state.status === 'loading' ? props.state : undefined}>
      {(state) => (
        <WeatherStatusSurface sceneStyle={props.sceneStyle}>
          <span
            aria-hidden="true"
            class="i-tabler-loader-2 size-4 animate-spin motion-reduce:animate-none"
          />
          {state().cityLabel} 날씨 확인 중
        </WeatherStatusSurface>
      )}
    </Match>
    <Match when={props.state.status === 'error' ? props.state : undefined}>
      {(state) => (
        <WeatherStatusSurface sceneStyle={props.sceneStyle}>
          <span aria-hidden="true" class="i-tabler-cloud-off size-4 text-muted-foreground" />
          {state().cityLabel} 날씨를 확인하지 못했어요
        </WeatherStatusSurface>
      )}
    </Match>
    <Match when={props.state.status === 'ready' ? props.state : undefined}>
      {(state) => {
        const presentation = () => getWeatherPresentation(state().feed.current.condition)
        const temperatureLabel = () => {
          const temperature = state().feed.current.temperatureCelsius
          return temperature === null ? null : ` · ${Math.round(temperature)}°`
        }

        return (
          <WeatherStatusSurface sceneStyle={props.sceneStyle}>
            <span aria-hidden="true" class={cx(presentation().icon, 'size-4 text-highlight')} />
            <span>
              {state().feed.city.label} · {presentation().label}
              <Show when={temperatureLabel()}>{(label) => label()}</Show>
              <Show when={state().feed.stale}> · 업데이트 지연</Show>
            </span>
          </WeatherStatusSurface>
        )
      }}
    </Match>
  </Switch>
)
