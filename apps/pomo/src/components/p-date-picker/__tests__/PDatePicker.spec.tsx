/** @vitest-environment jsdom */
import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
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
it.each([
  {date: '2024-02-28', key: 'ArrowLeft'},
  {date: '2024-03-01', key: 'ArrowRight'},
  {date: '2024-02-22', key: 'ArrowUp'},
  {date: '2024-03-07', key: 'ArrowDown'},
])('should follow external changes and navigate with $key', ({date, key}) => {
  const [value, setValue] = createSignal('2024-02-29')
  render(() => <PDatePicker label="날짜" value={value()} onChange={setValue} />)
  fireEvent.click(screen.getByRole('button', {name: '날짜: 2024-02-29'}))
  fireEvent.keyDown(screen.getByRole('button', {name: '2024-02-29'}), {key})
  expect(screen.getByRole('button', {name: date})).toHaveFocus()
  fireEvent.click(screen.getByRole('button', {name: date}))
  expect(value()).toBe(date)
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
  const view = render(() => <PDatePicker label="날짜" value="2026-10-15" />)
  fireEvent.click(screen.getByRole('button', {name: '날짜: 2026-10-15'}))
  const getDateButtons = () =>
    Array.from(view.container.querySelectorAll<HTMLButtonElement>('button[data-date^="2026-10-"]'))
  const buttons = getDateButtons()
  expect(buttons).toHaveLength(31)
  buttons.forEach((button) => {
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-label', button.dataset.date)
  })
  expect(buttons[0]).toBeVisible()
  expect(buttons[0]).toHaveAccessibleName('2026-10-01')
  fireEvent.keyDown(screen.getByRole('button', {name: '2026-10-15'}), {key: 'ArrowRight'})
  const currentButtons = getDateButtons()
  expect(currentButtons).toHaveLength(31)
  currentButtons.forEach((button, index) => {
    expect(button).toBe(buttons[index])
    expect(button).toHaveAttribute('aria-label', button.dataset.date)
  })
  expect(screen.getByRole('button', {name: '2026-10-16'})).toHaveFocus()
  expect(screen.getByRole('button', {name: '2026-10-16'})).toHaveAttribute('tabindex', '0')
  expect(screen.getByRole('button', {name: '2026-10-15'})).toHaveAttribute('tabindex', '-1')
})

it('should update controlled selection and bounds without replacing mounted date buttons', () => {
  const [value, setValue] = createSignal('2026-10-15')
  const [minimum, setMinimum] = createSignal('2026-10-01')
  const [maximum, setMaximum] = createSignal('2026-10-31')
  const onChange = vi.fn()
  const view = render(() => (
    <PDatePicker label="날짜" value={value()} min={minimum()} max={maximum()} onChange={onChange} />
  ))
  const trigger = screen.getByRole('button', {name: '날짜: 2026-10-15'})
  fireEvent.click(trigger)
  const buttons = Array.from(view.container.querySelectorAll<HTMLButtonElement>('[data-date]'))
  const selected = buttons[14]
  const next = buttons[15]
  expect(selected).toHaveAttribute('aria-pressed', 'true')
  setValue('2026-10-16')
  expect(selected).toHaveAttribute('aria-pressed', 'false')
  expect(next).toHaveAttribute('aria-pressed', 'true')
  setMinimum('2026-10-16')
  setMaximum('2026-10-16')
  expect(selected).toBeDisabled()
  expect(next).toBeEnabled()
  expect(buttons[16]).toBeDisabled()
  const currentButtons = Array.from(view.container.querySelectorAll('[data-date]'))
  expect(currentButtons).toHaveLength(buttons.length)
  currentButtons.forEach((button, index) => expect(button).toBe(buttons[index]))
  fireEvent.click(next)
  expect(onChange).toHaveBeenCalledExactlyOnceWith('2026-10-16')
  expect(trigger).toHaveFocus()
})

it.each([
  {count: 31, date: '2024-02-29', key: 'PageDown', target: '2024-03-29'},
  {count: 29, date: '2024-03-31', key: 'PageUp', target: '2024-02-29'},
  {count: 31, date: '2026-12-31', key: 'ArrowRight', target: '2027-01-01'},
  {count: 31, date: '2027-01-01', key: 'ArrowLeft', target: '2026-12-31'},
])(
  'should replace date cells and focus $target after $key from $date',
  ({date, key, target, count}) => {
    const onChange = vi.fn()
    const view = render(() => (
      <PDatePicker
        label="날짜"
        value={date}
        min="2024-01-01"
        max="2027-12-31"
        onChange={onChange}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: `날짜: ${date}`}))
    const oldButtons = Array.from(view.container.querySelectorAll('[data-date]'))
    fireEvent.keyDown(screen.getByRole('button', {name: date}), {key})
    const buttons = Array.from(view.container.querySelectorAll<HTMLButtonElement>('[data-date]'))
    expect(buttons).toHaveLength(count)
    expect(new Set(buttons.map((button) => button.dataset.date)).size).toBe(count)
    expect(buttons.every((button) => button.dataset.date?.startsWith(target.slice(0, 7)))).toBe(
      true,
    )
    expect(oldButtons.every((button) => !button.isConnected)).toBe(true)
    const focused = screen.getByRole('button', {name: target})
    expect(focused).toHaveFocus()
    expect(focused).toHaveAttribute('tabindex', '0')
    fireEvent.click(focused)
    expect(onChange).toHaveBeenCalledExactlyOnceWith(target)
  },
)

it.each([
  {key: 'Home', target: '2026-10-11'},
  {key: 'End', target: '2026-10-17'},
])('should keep the date object available for $key navigation', ({key, target}) => {
  render(() => <PDatePicker label="날짜" value="2026-10-15" min="2026-01-01" max="2026-12-31" />)
  fireEvent.click(screen.getByRole('button', {name: '날짜: 2026-10-15'}))
  fireEvent.keyDown(screen.getByRole('button', {name: '2026-10-15'}), {key})
  expect(screen.getByRole('button', {name: target})).toHaveFocus()
})

it('should restore the selected date with new cells on reopen and preserve blank placeholders', () => {
  const [value, setValue] = createSignal('2026-10-15')
  const view = render(() => (
    <PDatePicker
      label="날짜"
      value={value()}
      min="2026-01-01"
      max="2026-12-31"
      onChange={setValue}
      clearable
    />
  ))
  const trigger = screen.getByRole('button', {name: '날짜: 2026-10-15'})
  fireEvent.click(trigger)
  const old = screen.getByRole('button', {name: '2026-10-15'})
  const grid = old.parentElement!
  expect(
    Array.from(grid.children)
      .slice(7, 11)
      .every((cell) => cell.outerHTML === '<span></span>'),
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', {name: '2026-10-16'}))
  expect(value()).toBe('2026-10-16')
  expect(trigger).toHaveFocus()
  fireEvent.click(trigger)
  expect(old).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: '2026-10-16'})).toHaveFocus()
  expect(screen.getByRole('button', {name: '2026-10-16'})).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', {name: '선택 지우기'}))
  expect(value()).toBe('')
  expect(trigger).toHaveAccessibleName('날짜: 날짜 선택')
  expect(trigger).toHaveFocus()
})

it('should preserve date keys during locale re-evaluation and format labels again on reopen', () => {
  const originalGetLocale = getLocale
  const [locale, setLocale] = createSignal<'ko' | 'en'>('ko')
  overwriteGetLocale(locale)
  try {
    const view = render(() => (
      <PDatePicker label="날짜" value="2026-10-15" min="2026-01-01" max="2026-12-31" />
    ))
    const trigger = screen.getByRole('button', {name: '날짜: 2026-10-15'})
    fireEvent.click(trigger)
    const button = screen.getByRole('button', {name: '2026-10-15'})
    const weekdays = () =>
      Array.from(button.parentElement!.querySelectorAll('[aria-hidden]')).map(
        (cell) => cell.textContent,
      )
    const expectedWeekdays = (language: string) =>
      Array.from({length: 7}, (_, index) =>
        new Intl.DateTimeFormat(language, {timeZone: 'UTC', weekday: 'narrow'}).format(
          Date.UTC(2026, 0, 4 + index),
        ),
      )
    expect(weekdays()).toEqual(expectedWeekdays('ko'))
    setLocale('en')
    expect(weekdays()).toEqual(expectedWeekdays('en'))
    expect(screen.getByRole('button', {name: '2026-10-15'})).toBe(button)
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('data-date', '2026-10-15')
    fireEvent.keyDown(button, {key: 'Escape'})
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    expect(screen.getByRole('button', {name: '2026-10-15'})).not.toBe(button)
    expect(screen.getByRole('button', {name: '2026-10-15'})).toHaveFocus()
    expect(view.container.querySelectorAll('[data-date]')).toHaveLength(31)
    expect(screen.getByRole('button', {name: /October|Oct/u})).toBeVisible()
    view.unmount()
    setLocale('ko')
    render(() => <PDatePicker label="날짜" value="2026-10-15" min="2026-01-01" max="2026-12-31" />)
    fireEvent.click(screen.getByRole('button', {name: '날짜: 2026-10-15'}))
    expect(screen.getByRole('button', {name: '2026-10-15'})).toHaveFocus()
    expect(screen.getByRole('button', {name: /10월/u})).toBeVisible()
  } finally {
    overwriteGetLocale(originalGetLocale)
  }
})
