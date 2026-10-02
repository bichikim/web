/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {Lunar} from '../Lunar'

afterEach(() => {
  localStorage.clear()
})

const renderLunarInLunarMode = () => {
  localStorage.setItem('pomo:tool-lunar-direction:v1', '"lunar"')
  return render(() => (
    <PreferenceProvider>
      <Lunar />
    </PreferenceProvider>
  ))
}

type SelectPointerEventName = 'pointerdown' | 'pointerup'

const createSelectPointerEvent = (eventName: SelectPointerEventName) => {
  const event = new MouseEvent(eventName, {bubbles: true, button: 0})
  Object.defineProperties(event, {
    pointerId: {value: 1},
    pointerType: {value: 'mouse'},
  })
  return event
}

const dispatchSelectPointerEvent = (target: HTMLElement, eventName: SelectPointerEventName) =>
  fireEvent(target, createSelectPointerEvent(eventName))

const openSelect = async (label: RegExp) => {
  const trigger = screen.getByRole('button', {name: label})
  dispatchSelectPointerEvent(trigger, 'pointerdown')
  await Promise.resolve()
  dispatchSelectPointerEvent(trigger, 'pointerup')
  await Promise.resolve()
}

const selectOpenOption = async (label: RegExp, value: string) => {
  const listbox = screen.getByRole('listbox', {name: label})
  const option = within(listbox).getByRole('option', {name: value})
  dispatchSelectPointerEvent(option, 'pointerdown')
  await Promise.resolve()
  dispatchSelectPointerEvent(option, 'pointerup')
  await Promise.resolve()
}

const selectOption = async (label: RegExp, value: string) => {
  await openSelect(label)
  await selectOpenOption(label, value)
}

it('should render 29-day months and reconcile a selected day after changing months', async () => {
  renderLunarInLunarMode()
  expect(await screen.findByText('2026-02-17')).toBeVisible()

  await selectOption(/음력 일/u, '30')
  await selectOption(/음력 월/u, '2')

  expect(screen.getByRole('button', {name: /음력 일/u})).toHaveTextContent('29')
  await openSelect(/음력 일/u)
  const dayListbox = screen.getByRole('listbox', {name: '음력 일'})
  expect(within(dayListbox).getByRole('option', {name: '29'})).toBeVisible()
  expect(within(dayListbox).queryByRole('option', {name: '30'})).not.toBeInTheDocument()
})
