import {Tabs} from '@kobalte/core/tabs'

import {PSelect, type PSelectOption} from '../design-system/PSelect'
import {PSwitch} from '../design-system/PSwitch'
import type {WeatherCitySlug} from '../features/weather'

const WEATHER_CITY_OPTIONS = [
  {label: '서울', value: 'seoul'},
] satisfies readonly PSelectOption<WeatherCitySlug>[]

export interface PWeatherSettingsProps {
  readonly citySlug?: WeatherCitySlug
  readonly enabled?: boolean
  readonly onCityChange?: (citySlug: WeatherCitySlug) => void
  readonly onEnabledChange?: (enabled: boolean) => void
}

export const PWeatherSettings = (props: PWeatherSettingsProps) => (
  <Tabs.Content value="weather">
    <div class="grid gap-5">
      <PSwitch
        checked={props.enabled ?? true}
        description="선택한 도시의 기상청 날씨를 집중 화면에 아이콘과 글자로 보여줘요."
        label="집중 화면에 날씨 표시"
        onChange={(enabled) => props.onEnabledChange?.(enabled)}
      />
      <PSelect
        disabled={(props.enabled ?? true) === false}
        label="도시"
        onChange={(citySlug) => props.onCityChange?.(citySlug)}
        options={WEATHER_CITY_OPTIONS}
        value={props.citySlug ?? 'seoul'}
      />
      <p class="m-0 text-xs leading-5 text-muted-foreground">
        현재 서울을 먼저 지원해요. 데이터 제공: 기상청
      </p>
    </div>
  </Tabs.Content>
)
