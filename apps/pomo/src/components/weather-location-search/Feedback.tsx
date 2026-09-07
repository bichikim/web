import {Show} from 'solid-js'
import {type WeatherLocationSearchStatus} from '../../features/weather'
import * as m from '@paraglide/message'

interface WeatherLocationSearchFeedbackProps {
  readonly resultCount: number
  readonly status: WeatherLocationSearchStatus
}

export const WeatherLocationSearchFeedback = (props: WeatherLocationSearchFeedbackProps) => (
  <>
    <Show when={props.status === 'input-required'}>
      <p class="m-0 px-3 py-2 text-sm text-muted-foreground">
        {m.weather_location_search_minimum()}
      </p>
    </Show>
    <Show when={props.status === 'error'}>
      <p class="m-0 px-3 py-2 text-sm text-muted-foreground">{m.weather_location_search_error()}</p>
    </Show>
    <Show when={props.status === 'ready' && props.resultCount === 0}>
      <p class="m-0 px-3 py-2 text-sm text-muted-foreground">{m.weather_location_search_empty()}</p>
    </Show>
  </>
)
