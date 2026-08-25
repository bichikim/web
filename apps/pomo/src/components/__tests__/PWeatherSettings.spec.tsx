/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

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
  fireEvent.click(screen.getByRole('button', {name: 'seoul:false'}))
  expect(PSelect).toHaveBeenCalledWith(expect.objectContaining({disabled: false, value: 'seoul'}))
  expect(PSwitch).toHaveBeenCalledWith(expect.objectContaining({checked: true}))
})

it('should disable city selection and forward explicit setting changes', () => {
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
  fireEvent.click(screen.getByRole('button', {name: 'incheon:true'}))
  expect(onEnabledChange).toHaveBeenCalledWith(true)
  expect(onCityChange).toHaveBeenCalledWith('busan')
})
