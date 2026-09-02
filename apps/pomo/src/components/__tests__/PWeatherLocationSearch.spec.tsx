/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
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
      Input: (props: JSX.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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
import {LEGACY_WEATHER_LOCATIONS, type WeatherLocation} from '../../features/weather'

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
const worldSeoul = {
  country: 'KR',
  id: 'openweather:37.5683,126.9778',
  name: 'Seoul',
  region: 'Seoul',
} as const satisfies WeatherLocation
const yemenBusan = {
  country: 'YE',
  id: 'openweather:14.3400,44.1800',
  name: 'Busan',
  region: 'Dhamar Governorate',
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
  const description = screen.getByText(
    '입력란을 누르면 기본 도시가 열려요. 도시 이름을 입력하면 비슷한 도시를 검색해요.',
  )
  expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', description.id)
  const props = comboboxMocks.rootProps as {
    itemComponent: (props: {item: {rawValue: WeatherLocation}}) => JSX.Element
    defaultFilter: (location: WeatherLocation, query: string) => boolean
    onChange: (location: WeatherLocation | null) => void
    onInputChange: (query: string) => void
    onOpenChange: (open: boolean) => void
    open: boolean
    options: ReadonlyArray<WeatherLocation>
    optionLabel: (location: WeatherLocation) => string
    optionTextValue: (location: WeatherLocation) => string
    value: WeatherLocation
    placeholder: string
  }

  const defaultLocations = Object.values(LEGACY_WEATHER_LOCATIONS)
  expect(props.options).toEqual([
    seoul,
    ...defaultLocations.filter((location) => location.id !== seoul.id),
  ])
  expect(props.defaultFilter(tokyo, 'unrelated query')).toBe(true)
  expect(props.value).toBe(seoul)
  expect(props.open).toBe(false)
  expect(props.placeholder).not.toBe('')
  expect(props.optionLabel(seoul)).toBe('서울')
  expect(props.optionTextValue(tokyo)).toBe('Tokyo Tokyo  Japan')
  fireEvent.focus(screen.getByRole('textbox'))
  expect(props.open).toBe(true)
  props.onOpenChange(false)
  expect(props.open).toBe(false)
  render(() => <>{props.itemComponent({item: {rawValue: tokyo}})}</>)
  props.onInputChange('Tokyo')
  expect(props.options).toEqual([seoul, tokyo])
  props.onInputChange(' 서울 ')
  expect(props.options).toEqual([
    seoul,
    ...defaultLocations.filter((location) => location.id !== seoul.id),
  ])
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

it('should explain the minimum query length', () => {
  searchMocks.status.mockReturnValue('input-required')
  searchMocks.results.mockReturnValue([])

  render(() => <PWeatherLocationSearch />)

  expect(screen.getAllByText('도시 이름을 두 글자 이상 입력해 주세요.')).toHaveLength(2)
})

it('should not duplicate an old stored Korean city with its localized default', () => {
  render(() => <PWeatherLocationSearch location={worldSeoul} />)

  const props = comboboxMocks.rootProps as {
    options: ReadonlyArray<WeatherLocation>
  }
  expect(props.options).toEqual([
    worldSeoul,
    ...Object.values(LEGACY_WEATHER_LOCATIONS).filter(
      (location) => location.id !== LEGACY_WEATHER_LOCATIONS.seoul.id,
    ),
  ])
})

it('should match a default city by its stable legacy slug', () => {
  const selectedSeoul = {
    ...worldSeoul,
    country: 'Republic of Korea',
    legacyCitySlug: 'seoul' as const,
    name: 'Seoul City',
  }

  render(() => <PWeatherLocationSearch location={selectedSeoul} />)

  const props = comboboxMocks.rootProps as {
    options: ReadonlyArray<WeatherLocation>
  }
  expect(props.options).toEqual([
    selectedSeoul,
    ...Object.values(LEGACY_WEATHER_LOCATIONS).filter(
      (location) => location.legacyCitySlug !== selectedSeoul.legacyCitySlug,
    ),
  ])
})

it('should keep a Korean default when a foreign city has the same name', () => {
  render(() => <PWeatherLocationSearch location={yemenBusan} />)

  const props = comboboxMocks.rootProps as {
    options: ReadonlyArray<WeatherLocation>
  }
  expect(props.options).toContain(yemenBusan)
  expect(props.options).toContain(LEGACY_WEATHER_LOCATIONS.busan)
})
