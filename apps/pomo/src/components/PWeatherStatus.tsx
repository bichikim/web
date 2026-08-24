import {cx} from 'class-variance-authority'
import {Match, Show, Switch} from 'solid-js'

import type {PSceneStyle} from '../features/focus-room-animation'
import {getLocalizedWeatherCityLabel, getLocalizedWeatherLabel} from '../features/localization'
import {getWeatherPresentation, type WeatherState} from '../features/weather'
import * as m from '../paraglide/messages.js'
import {WeatherStatusSurface} from './weather-status/Surface'

export interface PWeatherStatusProps {
  readonly sceneStyle?: PSceneStyle
  readonly state: WeatherState
}

export const PWeatherStatus = (props: PWeatherStatusProps) => (
  <Switch>
    <Match when={props.state.status === 'loading' ? props.state : undefined}>
      {(state) => (
        <WeatherStatusSurface sceneStyle={props.sceneStyle}>
          <span
            aria-hidden="true"
            class="i-tabler-loader-2 size-4 animate-spin motion-reduce:animate-none"
          />
          {m.weather_loading({city: getLocalizedWeatherCityLabel(state().citySlug)})}
        </WeatherStatusSurface>
      )}
    </Match>
    <Match when={props.state.status === 'error' ? props.state : undefined}>
      {(state) => (
        <WeatherStatusSurface sceneStyle={props.sceneStyle}>
          <span aria-hidden="true" class="i-tabler-cloud-off size-4 text-muted-foreground" />
          {m.weather_error({city: getLocalizedWeatherCityLabel(state().citySlug)})}
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
              {getLocalizedWeatherCityLabel(state().feed.city.slug)} ·{' '}
              {getLocalizedWeatherLabel(state().feed.current.condition)}
              <Show when={temperatureLabel()}>{(label) => label()}</Show>
              <Show when={state().feed.stale}> · {m.weather_stale()}</Show>
            </span>
          </WeatherStatusSurface>
        )
      }}
    </Match>
  </Switch>
)
