/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {PWeatherDisplaySwitch} from '../PWeatherDisplaySwitch'

afterEach(() => {
  vi.clearAllMocks()
})

it('should reflect the saved weather visibility and forward changes', () => {
  const onEnabledChange = vi.fn()
  render(() => (
    <PWeatherDisplaySwitch onWeatherEnabledChange={onEnabledChange} weatherEnabled={false} />
  ))

  const weatherSwitch = screen.getByRole('switch', {name: '날씨 표시'})
  expect(weatherSwitch).not.toBeChecked()
  expect(screen.getByText('선택한 도시의 날씨를 보여줘요.')).toBeInTheDocument()

  fireEvent.click(weatherSwitch)
  expect(onEnabledChange).toHaveBeenCalledWith(true)
})
