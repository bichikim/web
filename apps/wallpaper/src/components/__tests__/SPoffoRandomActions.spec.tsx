/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import type {RandomActionSettings} from '@winter-love/wallpaper/settings/random-actions'
import {SPoffoRandomActions} from '../SPoffoRandomActions'
afterEach(cleanup)
test('should edit the random chance without a second list of behavior switches', () => {
  const [value, setValue] = createSignal<RandomActionSettings>({
    enabled: true,
    probability: 0.3,
  })
  render(() => <SPoffoRandomActions value={value()} onChange={setValue} />)
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  const input = screen.getByRole('spinbutton', {name: '랜덤 행동 확률'})
  fireEvent.input(input, {target: {value: '65'}})
  fireEvent.blur(input)
  expect(value().probability).toBe(0.65)
  fireEvent.click(screen.getByRole('switch', {name: '랜덤 행동 사용'}))
  expect(value().enabled).toBe(false)
  expect(screen.queryByRole('spinbutton', {name: '랜덤 행동 확률'})).toBeNull()
})

test('should start with a 50 percent chance when random actions are first enabled', () => {
  const [value, setValue] = createSignal<RandomActionSettings>()
  render(() => <SPoffoRandomActions value={value()} onChange={setValue} />)
  fireEvent.click(screen.getByRole('switch', {name: '랜덤 행동 사용'}))
  expect(value()).toEqual({enabled: true, probability: 0.5})
  expect(screen.getByRole('spinbutton', {name: '랜덤 행동 확률'})).toHaveValue('50')
})

test.each([0, 37, 100])('should persist a user-selected %s percent chance', (percent) => {
  const [value, setValue] = createSignal<RandomActionSettings>({
    enabled: true,
    probability: 0.5,
  })
  render(() => <SPoffoRandomActions value={value()} onChange={setValue} />)
  const input = screen.getByRole('spinbutton', {name: '랜덤 행동 확률'})
  expect(input).toHaveAttribute('aria-valuemin', '0')
  expect(input).toHaveAttribute('aria-valuemax', '100')
  fireEvent.input(input, {target: {value: String(percent)}})
  fireEvent.blur(input)
  expect(value().probability).toBe(percent / 100)
})
