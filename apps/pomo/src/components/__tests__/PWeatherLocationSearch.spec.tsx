/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const searchMocks = vi.hoisted(() => ({
  onQueryChange: vi.fn(),
  onSelect: vi.fn(),
  results: vi.fn(),
  status: vi.fn(),
  useWeatherLocationSearch: vi.fn(),
}))
const comboboxMocks = vi.hoisted(() => ({
  rootProps: undefined as Record<string, unknown> | undefined,
}))

vi.mock('../../features/weather/use-location-search', () => ({
  useWeatherLocationSearch: searchMocks.useWeatherLocationSearch,
}))
vi.mock('@kobalte/core/combobox', () => {
  const passthrough = (props: {readonly children?: JSX.Element}) => {
    Object.values(props)
    return <>{props.children}</>
  }
  const Combobox = Object.assign(
    vi.fn((props: Record<string, unknown> & {readonly children?: JSX.Element}) => {
      comboboxMocks.rootProps = props
      return <>{props.children}</>
    }),
    {
      Content: passthrough,
      Control: passthrough,
      HiddenSelect: () => null,
      Input: () => null,
      Item: passthrough,
      ItemDescription: passthrough,
      ItemLabel: passthrough,
      Label: passthrough,
      Listbox: () => null,
      Portal: passthrough,
    },
  )
  return {Combobox}
})

import {PWeatherLocationSearch} from '../PWeatherLocationSearch'
import type {WeatherLocation} from '../../features/weather'

const seoul = {
  country: '대한민국',
  id: 'openweather:legacy:seoul',
  legacyCitySlug: 'seoul',
  name: '서울',
  region: '서울특별시',
} as const satisfies WeatherLocation
const tokyo = {
  country: 'Japan',
  id: 'openweather:35.6900,139.6900',
  name: 'Tokyo',
  region: '',
} as const satisfies WeatherLocation

beforeEach(() => {
  vi.clearAllMocks()
  comboboxMocks.rootProps = undefined
  searchMocks.results.mockReturnValue([seoul, tokyo])
  searchMocks.status.mockReturnValue('idle')
  searchMocks.useWeatherLocationSearch.mockReturnValue({
    onQueryChange: searchMocks.onQueryChange,
    onSelect: searchMocks.onSelect,
    results: searchMocks.results,
    status: searchMocks.status,
  })
})

afterEach(() => {
  document.body.textContent = ''
})

it('should configure unique location options and forward search and selection', () => {
  const onChange = vi.fn()
  render(() => <PWeatherLocationSearch location={seoul} onChange={onChange} />)
  expect(screen.getByRole('link', {name: 'Weather data © OpenWeather'})).toHaveAttribute(
    'href',
    'https://openweathermap.org/',
  )
  const props = comboboxMocks.rootProps as {
    itemComponent: (props: {item: {rawValue: WeatherLocation}}) => JSX.Element
    onChange: (location: WeatherLocation | null) => void
    onInputChange: (query: string) => void
    options: ReadonlyArray<WeatherLocation>
    optionLabel: (location: WeatherLocation) => string
    optionTextValue: (location: WeatherLocation) => string
    value: WeatherLocation
    placeholder: string
  }

  expect(props.options).toEqual([seoul, tokyo])
  expect(props.value).toBe(seoul)
  expect(props.placeholder).not.toBe('')
  expect(props.optionLabel(seoul)).toBe('서울')
  expect(props.optionTextValue(tokyo)).toBe('Tokyo Tokyo  Japan')
  render(() => <>{props.itemComponent({item: {rawValue: tokyo}})}</>)
  props.onInputChange('Tokyo')
  props.onInputChange(' 서울 ')
  props.onChange(tokyo)
  props.onChange(null)

  expect(searchMocks.onQueryChange).toHaveBeenCalledWith('Tokyo')
  expect(searchMocks.onSelect).toHaveBeenCalledWith(seoul)
  expect(searchMocks.onSelect).toHaveBeenCalledWith(tokyo)
  expect(onChange).toHaveBeenCalledWith(tokyo)
})

it.each(['searching', 'error', 'ready'] as const)(
  'should render the %s search feedback with the default location',
  (status) => {
    searchMocks.status.mockReturnValue(status)
    searchMocks.results.mockReturnValue([])

    const view = render(() => <PWeatherLocationSearch />)

    expect(view.container.textContent).not.toBe('')
    expect(comboboxMocks.rootProps).toEqual(expect.objectContaining({value: seoul}))
  },
)
