/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {CalendarGrid} from '../Grid'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should label days, mark today and selection, and forward the selected date', () => {
  const date = new Date(2026, 8, 4)
  const onSelect = vi.fn()
  render(() => (
    <CalendarGrid
      days={[[null, {date, key: '2026-09-04', number: 4}]]}
      eventsByDay={new Map()}
      onSelect={onSelect}
      selectedKey="2026-09-04"
      todayKey="2026-09-04"
    />
  ))
  expect(screen.getAllByRole('columnheader')).toHaveLength(7)
  const button = screen.getByRole('button')
  expect(button).toHaveAttribute('aria-current', 'date')
  expect(button).toHaveAttribute('aria-pressed', 'true')
  expect(button).toHaveClass('rounded-panel-inner')
  fireEvent.click(button)
  expect(onSelect).toHaveBeenCalledWith(date)
  expect(screen.getAllByRole('gridcell')).toHaveLength(2)
})
