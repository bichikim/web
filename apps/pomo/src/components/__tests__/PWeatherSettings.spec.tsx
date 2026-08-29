/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import type {WeatherSceneMode} from '../../features/weather'
import {PSelect} from '../PSelect'
import {PSwitch} from '../PSwitch'
import {PWeatherSettings} from '../PWeatherSettings'

vi.mock('../PSelect', () => ({
  PSelect: vi.fn((props: Parameters<typeof PSelect>[0]) => {
    Object.values(props)
    return (
      <button
        onClick={() => {
          if (props.multiple) {
            props.onChange(['busan'])
          } else {
            props.onChange('busan')
          }
        }}
        type="button"
      >
        {`${props.value}:${String(props.disabled)}`}
      </button>
    )
  }),
}))
vi.mock('../PSwitch', () => ({
  PSwitch: vi.fn((props: Parameters<typeof PSwitch>[0]) => {
    Object.values(props)
    return (
      <button onClick={() => props.onChange?.(!props.checked)} type="button">
        {String(props.checked)}
      </button>
    )
  }),
}))

afterEach(() => {
  vi.clearAllMocks()
})

it('should use enabled Seoul weather defaults without requiring handlers', () => {
  render(() => <PWeatherSettings />)

  fireEvent.click(screen.getByRole('button', {name: 'true'}))
  fireEvent.click(screen.getByRole('button', {name: 'seoul:undefined'}))
  expect(PSelect).toHaveBeenCalledWith(expect.objectContaining({value: 'seoul'}))
  expect(PSwitch).toHaveBeenCalledWith(expect.objectContaining({checked: true}))
})

it('should keep city selection enabled and forward explicit setting changes', () => {
  const onCityChange = vi.fn()
  const onEnabledChange = vi.fn()
  render(() => (
    <PWeatherSettings
      citySlug="incheon"
      enabled={false}
      onCityChange={onCityChange}
      onEnabledChange={onEnabledChange}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: 'false'}))
  fireEvent.click(screen.getByRole('button', {name: 'incheon:undefined'}))
  expect(onEnabledChange).toHaveBeenCalledWith(true)
  expect(onCityChange).toHaveBeenCalledWith('busan')
})

it('should expose automatic and manual weather scene choices', () => {
  const onSceneModeChange = vi.fn()
  render(() => <PWeatherSettings onSceneModeChange={onSceneModeChange} sceneMode="cloudy" />)

  const weatherSelect = vi
    .mocked(PSelect)
    .mock.calls.map(([props]) => props)
    .find((props) => props.label === '날씨')

  expect(weatherSelect).toMatchObject({
    options: [
      {label: '자동', value: 'auto'},
      {label: '맑음', value: 'clear'},
      {label: '비', value: 'rain'},
      {label: '눈', value: 'snow'},
      {label: '구름 많음', value: 'cloudy'},
      {label: '흐림', value: 'overcast'},
    ],
    value: 'cloudy',
  })

  const onChange = weatherSelect?.onChange as ((mode: WeatherSceneMode) => void) | undefined
  onChange?.('rain')
  expect(onSceneModeChange).toHaveBeenCalledWith('rain')
})
