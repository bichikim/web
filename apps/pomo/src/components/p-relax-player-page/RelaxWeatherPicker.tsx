import * as m from '@paraglide/message'
import {PRadioSwitch} from 'src/components/p-radio-switch'
import type {RelaxWeather} from './types'

export interface RelaxWeatherPickerProps {
  readonly onChange: (weather: RelaxWeather) => void
  readonly weather: RelaxWeather
}

export const RelaxWeatherPicker = (props: RelaxWeatherPickerProps) => (
  <PRadioSwitch
    class="mt-5"
    label={m.relax_weather_title()}
    onChange={props.onChange}
    options={[
      {label: m.relax_weather_sunny(), value: 'sunny'},
      {label: m.relax_weather_rainy(), value: 'rainy'},
    ]}
    value={props.weather}
  />
)
