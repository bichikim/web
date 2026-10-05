/** @vitest-environment jsdom */
import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {PDatePicker} from '../PDatePicker'
it('should select a bounded date with a custom calendar and return focus', async () => {
  const onChange = vi.fn()
  const view = render(() => (
    <PDatePicker
      label="입대일"
      value="2026-02-17"
      min="2026-02-15"
      max="2026-02-28"
      onChange={onChange}
    />
  ))
  const trigger = within(view.container).getByRole('button', {name: '입대일: 2026-02-17'})

  expect(trigger).toBeVisible()
  expect(trigger).toHaveAccessibleName('입대일: 2026-02-17')
  fireEvent.click(trigger)
  expect(view.container.querySelector('input[type=date]')).toBeNull()
  const getDateButton = (date: string) => {
    const button = within(view.container).getByRole('button', {name: date})

    expect(button).toBeVisible()
    expect(button).toHaveAccessibleName(date)
    expect(button).toHaveAttribute('aria-label', date)
    return button
  }
  expect(getDateButton('2026-02-14')).toBeDisabled()
  fireEvent.click(getDateButton('2026-02-18'))
  expect(onChange).toHaveBeenCalledWith('2026-02-18')
  expect(screen.queryByRole('button', {name: '2026-02-18'})).not.toBeInTheDocument()
  expect(trigger).toBeInTheDocument()
  expect(trigger).toHaveFocus()
})
it('should follow external changes and navigate with keyboard across month boundaries', () => {
  const [value, setValue] = createSignal('2024-02-29')
  render(() => <PDatePicker label="날짜" value={value()} onChange={setValue} />)
  fireEvent.click(screen.getByRole('button', {name: '날짜: 2024-02-29'}))
  fireEvent.keyDown(screen.getByRole('button', {name: '2024-02-29'}), {key: 'ArrowRight'})
  expect(screen.getByRole('button', {name: '2024-03-01'})).toHaveFocus()
  fireEvent.click(screen.getByRole('button', {name: '2024-03-01'}))
  expect(value()).toBe('2024-03-01')
  setValue('2025-01-01')
  expect(screen.getByRole('button', {name: '날짜: 2025-01-01'})).toBeVisible()
})
it('should close the calendar from a month navigation button without bubbling Escape', () => {
  const escaped = vi.fn()
  render(() => (
    <div
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          escaped()
        }
      }}
    >
      <PDatePicker label="날짜" value="2026-09-09" />
    </div>
  ))
  const trigger = screen.getByRole('button', {name: '날짜: 2026-09-09'})
  fireEvent.click(trigger)
  const previous = screen.getByRole('button', {name: '이전 달'})
  previous.focus()
  fireEvent.keyDown(previous, {key: 'Escape'})
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(trigger).toHaveFocus()
  expect(escaped).not.toHaveBeenCalled()
})

it('should preserve every date button while moving focus within the same month', () => {
  render(() => <PDatePicker label="날짜" value="2026-10-15" />)
  fireEvent.click(screen.getByRole('button', {name: '날짜: 2026-10-15'}))
  const buttons = screen.getAllByRole('button', {name: /^2026-10-/})
  expect(buttons).toHaveLength(31)
  buttons.forEach((button) => {
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toBeVisible()
    expect(button).toHaveAccessibleName(button.getAttribute('data-date') ?? '')
    expect(button).toHaveAttribute('aria-label', button.dataset.date)
  })
  fireEvent.keyDown(screen.getByRole('button', {name: '2026-10-15'}), {key: 'ArrowRight'})
  const currentButtons = screen.getAllByRole('button', {name: /^2026-10-/})
  expect(currentButtons).toHaveLength(31)
  currentButtons.forEach((button, index) => {
    expect(button).toBe(buttons[index])
    expect(button).toBeVisible()
    expect(button).toHaveAccessibleName(button.getAttribute('data-date') ?? '')
  })
  expect(screen.getByRole('button', {name: '2026-10-16'})).toHaveFocus()
  expect(screen.getByRole('button', {name: '2026-10-16'})).toHaveAttribute('tabindex', '0')
  expect(screen.getByRole('button', {name: '2026-10-15'})).toHaveAttribute('tabindex', '-1')
})
