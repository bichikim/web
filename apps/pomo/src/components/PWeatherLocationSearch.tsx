import {PInput} from 'src/components/PInput'
import {FIELD_DESCRIPTION, FIELD_LABEL, FIELD_VALUE} from 'src/components/field-classes'
import {Combobox} from '@kobalte/core/combobox'
import {createSignal, createUniqueId, Show} from 'solid-js'
import {
  DEFAULT_WEATHER_LOCATION,
  LEGACY_WEATHER_LOCATIONS,
  useWeatherLocationSearch,
  type WeatherLocation,
} from '../features/weather'
import {
  getLocalizedWeatherLocationLabel,
  getWeatherLocationDescription,
} from '../features/localization'
import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {WeatherLocationSearchFeedback} from './weather-location-search/Feedback'

export interface PWeatherLocationSearchProps {
  readonly location?: WeatherLocation
  readonly onChange?: (location: WeatherLocation) => void
}

const getLocationName = (location: WeatherLocation): string => {
  const english = getLocalizedWeatherLocationLabel(location, {locale: 'en'})
  if (getLocale() !== 'ko') {
    return english
  }
  const korean = getLocalizedWeatherLocationLabel(location, {locale: 'ko'})
  return korean === english ? english : `${korean} / ${english}`
}

const DEFAULT_WEATHER_LOCATIONS = Object.values(LEGACY_WEATHER_LOCATIONS)
const LISTBOX_CLASS =
  'grid min-h-0 auto-rows-max gap-0.5 overflow-y-auto overscroll-contain outline-none'

const KOREAN_COUNTRIES = new Set(['KR', '대한민국'])

const normalizeLocationName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/(?:-si|시)$/u, '')

const getLocationNames = (location: WeatherLocation): ReadonlyArray<string> =>
  [
    location.name,
    getLocalizedWeatherLocationLabel(location, {locale: 'en'}),
    getLocalizedWeatherLocationLabel(location, {locale: 'ko'}),
  ].map(normalizeLocationName)

const isDefaultDuplicate = (
  selectedLocation: WeatherLocation,
  defaultLocation: WeatherLocation,
): boolean => {
  if (selectedLocation.id === defaultLocation.id) {
    return true
  }
  if (selectedLocation.legacyCitySlug !== undefined) {
    return selectedLocation.legacyCitySlug === defaultLocation.legacyCitySlug
  }
  if (!KOREAN_COUNTRIES.has(selectedLocation.country)) {
    return false
  }

  const selectedNames = new Set(getLocationNames(selectedLocation))
  return getLocationNames(defaultLocation).some((name) => selectedNames.has(name))
}

export const PWeatherLocationSearch = (props: PWeatherLocationSearchProps) => {
  const search = useWeatherLocationSearch()
  const descriptionId = createUniqueId()
  const [isOpen, setIsOpen] = createSignal(false)
  const [searchQuery, setSearchQuery] = createSignal('')
  const selectedLocation = () => props.location ?? DEFAULT_WEATHER_LOCATION
  const options = () => {
    const selected = selectedLocation()
    const locations =
      searchQuery() === ''
        ? [
            selected,
            ...DEFAULT_WEATHER_LOCATIONS.filter(
              (location) => !isDefaultDuplicate(selected, location),
            ),
          ]
        : search.results()
    return locations.filter(
      (location, index) =>
        locations.findIndex((candidate) => candidate.id === location.id) === index,
    )
  }
  const onInputChange = (query: string) => {
    const location = selectedLocation()
    const normalizedQuery = query.trim()
    const selectedNames = [
      location.name,
      getLocalizedWeatherLocationLabel(location),
      getLocationName(location),
    ]
    if (selectedNames.includes(normalizedQuery)) {
      setSearchQuery('')
      search.onSelect(location)
      return
    }

    setSearchQuery(normalizedQuery)
    search.onQueryChange(query)
  }

  return (
    <Combobox<WeatherLocation>
      allowsEmptyCollection
      modal
      class="grid w-full min-w-0 gap-1.5"
      defaultFilter={() => true}
      disallowEmptySelection
      gutter={6}
      itemComponent={(itemProps) => (
        <Combobox.Item
          class={
            'grid min-h-11 min-w-0 cursor-pointer gap-0.5 rounded-3 px-3 py-2 outline-none ' +
            'text-sm leading-5 text-muted-foreground transition-colors ' +
            'ui-highlighted:bg-secondary-soft ui-highlighted:text-foreground ' +
            'ui-selected:bg-primary-soft ui-selected:text-foreground motion-reduce:transition-none'
          }
          item={itemProps.item}
        >
          <Combobox.ItemLabel class="overflow-hidden text-ellipsis whitespace-nowrap font-650">
            {getLocationName(itemProps.item.rawValue)}
          </Combobox.ItemLabel>
          <Combobox.ItemDescription class="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
            {getWeatherLocationDescription(itemProps.item.rawValue)}
          </Combobox.ItemDescription>
        </Combobox.Item>
      )}
      onChange={(location) => {
        if (location !== null) {
          setSearchQuery('')
          search.onSelect(location)
          props.onChange?.(location)
        }
      }}
      onInputChange={onInputChange}
      onOpenChange={(open) => setIsOpen(open)}
      open={isOpen()}
      optionLabel={getLocationName}
      optionTextValue={(location) =>
        `${getLocationName(location)} ${location.name} ${location.region} ${location.country}`
      }
      optionValue="id"
      options={options()}
      placeholder={m.weather_location_search_placeholder()}
      sameWidth
      triggerMode="input"
      value={selectedLocation()}
    >
      <Combobox.Label class={FIELD_LABEL}>{m.weather_city()}</Combobox.Label>
      <Combobox.Control
        class={
          'flex h-control-md w-full min-w-0 items-center gap-3 rounded-control border border-solid ' +
          'border-border bg-surface px-4 text-foreground transition-colors ' +
          'focus-within:border-highlight hover:border-border-hover motion-reduce:transition-none'
        }
      >
        <span aria-hidden="true" class="i-tabler-map-pin size-4 flex-none text-highlight" />
        <Combobox.Input
          as={PInput}
          unstyled
          aria-describedby={descriptionId}
          class={`min-w-0 flex-1 border-0 bg-transparent p-0 ${FIELD_VALUE} outline-none`}
          onFocus={() => setIsOpen(true)}
        />
        <Show
          fallback={
            <span
              aria-hidden="true"
              class="i-tabler-search size-4 flex-none text-muted-foreground"
            />
          }
          when={search.status() === 'searching'}
        >
          <span
            aria-hidden="true"
            class="i-tabler-loader-2 size-4 flex-none animate-spin motion-reduce:animate-none"
          />
        </Show>
      </Combobox.Control>
      <p class={`m-0 ${FIELD_DESCRIPTION}`} id={descriptionId}>
        {m.weather_location_search_description()}
      </p>
      <p aria-live="polite" class="sr-only">
        <Show when={search.status() === 'input-required'}>
          {m.weather_location_search_minimum()}
        </Show>
        <Show when={search.status() === 'searching'}>{m.weather_location_searching()}</Show>
        <Show when={search.status() === 'error'}>{m.weather_location_search_error()}</Show>
      </p>
      <Combobox.Portal>
        <Combobox.Content
          class={
            'flex max-h-[min(18rem,var(--kb-popper-content-available-height,18rem))] flex-col ' +
            'w-[var(--kb-popper-anchor-width)] ' +
            'overflow-hidden rounded-4 border border-solid border-border bg-surface-strong p-2 ' +
            'text-foreground shadow-panel backdrop-blur-surface'
          }
        >
          <WeatherLocationSearchFeedback
            resultCount={search.results().length}
            status={search.status()}
          />
          <Combobox.Listbox class={LISTBOX_CLASS} />
        </Combobox.Content>
      </Combobox.Portal>
      <Combobox.HiddenSelect />
    </Combobox>
  )
}
