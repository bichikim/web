import {For} from 'solid-js'
import {cx} from 'class-variance-authority'

import * as m from '@paraglide/message'
import type {RelaxWeather} from './types'

export interface RelaxWeatherPickerProps {
  readonly onChange: (weather: RelaxWeather) => void
  readonly weather: RelaxWeather
}

export const RelaxWeatherPicker = (props: RelaxWeatherPickerProps) => (
  <fieldset class="m-0 mt-5 border-0 p-0">
    <legend class="mb-2 text-sm font-650 text-foreground">{m.relax_weather_title()}</legend>
    <div aria-label={m.relax_weather_title()} class="grid grid-cols-2 gap-2" role="radiogroup">
      <For each={['sunny', 'rainy'] as const}>
        {(weather) => (
          <label class="cursor-pointer">
            <input
              checked={props.weather === weather}
              class="peer sr-only"
              name="relax-weather"
              onChange={() => props.onChange(weather)}
              type="radio"
              value={weather}
            />
            <span
              class={cx(
                'block rounded-panel border border-solid border-border px-3 py-2 text-center text-sm',
                'text-foreground peer-checked:border-highlight peer-checked:bg-surface-strong',
                'peer-focus-visible:shadow-focus',
              )}
            >
              {weather === 'sunny' ? m.relax_weather_sunny() : m.relax_weather_rainy()}
            </span>
          </label>
        )}
      </For>
    </div>
  </fieldset>
)
