/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {PDatePicker} from '../PDatePicker'
it('should select a bounded date with a custom calendar and return focus', async () => {
  const onChange = vi.fn()
  const {container} = render(() => (
    <PDatePicker
      label="입대일"
      value="2026-02-17"
      min="2026-02-15"
      max="2026-02-28"
      onChange={onChange}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '입대일: 2026-02-17'}))
  expect(container.querySelector('input[type=date]')).toBeNull()
  expect(screen.getByRole('button', {name: '2026-02-14'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '2026-02-18'}))
  expect(onChange).toHaveBeenCalledWith('2026-02-18')
  expect(screen.queryByRole('button', {name: '2026-02-18'})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: '입대일: 2026-02-17'})).toHaveFocus()
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
