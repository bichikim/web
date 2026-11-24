/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {getLocale, type Locale, overwriteGetLocale} from '@paraglide/runtime'
import {CalendarGrid} from '../Grid'

const originalLocale = getLocale

afterEach(() => {
  cleanup()
  overwriteGetLocale(originalLocale)
  vi.restoreAllMocks()
})

it.each([
  {
    headers: ['일', '월', '화', '수', '목', '금', '토'],
    label: '2026년 9월 4일, 일정 0개',
    locale: 'ko',
  },
  {
    headers: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    label: 'September 4, 2026, 0 events',
    locale: 'en',
  },
] as const)('should preserve $locale headers and date selection', ({headers, label, locale}) => {
  overwriteGetLocale(() => locale)
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
  expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(headers)
  const button = screen.getByRole('button', {name: label})
  expect(button).toHaveAttribute('aria-current', 'date')
  expect(button).toHaveAttribute('aria-pressed', 'true')
  expect(button).toHaveClass('rounded-panel-inner')
  fireEvent.click(button)
  expect(onSelect).toHaveBeenCalledOnce()
  expect(onSelect).toHaveBeenCalledWith(date)
  expect(onSelect.mock.calls[0]?.[0]).toBe(date)
  expect(screen.getAllByRole('gridcell')).toHaveLength(2)
})

it('should read the current locale on remount while retaining headers on selection changes', () => {
  overwriteGetLocale(() => 'ko')
  const date = new Date(2026, 8, 4)
  const [selected, setSelected] = createSignal('2026-09-04')
  const renderGrid = () =>
    render(() => (
      <CalendarGrid
        days={[[{date, key: '2026-09-04', number: 4}]]}
        eventsByDay={new Map()}
        onSelect={vi.fn()}
        selectedKey={selected()}
        todayKey="2026-09-04"
      />
    ))
  const {unmount} = renderGrid()
  const headers = screen.getAllByRole('columnheader')
  overwriteGetLocale(() => 'en')
  setSelected('2026-09-05')
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  screen.getAllByRole('columnheader').forEach((header, index) => {
    expect(header).toBe(headers[index])
  })
  expect(headers.map((header) => header.textContent)).toEqual([
    '일',
    '월',
    '화',
    '수',
    '목',
    '금',
    '토',
  ])

  unmount()
  renderGrid()
  expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ])
})

it('should reevaluate headers when the locale getter tracks a Solid signal', () => {
  const [locale, setLocale] = createSignal<Locale>('ko')
  overwriteGetLocale(locale)
  render(() => (
    <CalendarGrid days={[]} eventsByDay={new Map()} onSelect={vi.fn()} selectedKey="" todayKey="" />
  ))
  expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
    '일',
    '월',
    '화',
    '수',
    '목',
    '금',
    '토',
  ])
  setLocale('en')
  expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ])
})

it('should create one native weekday formatter per evaluation without caching between mounts', () => {
  const [locale, setLocale] = createSignal<Locale>('ko')
  overwriteGetLocale(locale)
  const DateTimeFormat = Intl.DateTimeFormat
  const formatter = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function formatter(
    ...args
  ) {
    return new DateTimeFormat(...args)
  })
  const renderGrid = () =>
    render(() => (
      <CalendarGrid
        days={[]}
        eventsByDay={new Map()}
        onSelect={vi.fn()}
        selectedKey=""
        todayKey=""
      />
    ))
  const {unmount} = renderGrid()
  expect(formatter.mock.calls).toEqual([['ko', {weekday: 'short'}]])

  setLocale('en')
  expect(formatter.mock.calls).toEqual([
    ['ko', {weekday: 'short'}],
    ['en', {weekday: 'short'}],
  ])

  unmount()
  renderGrid()
  expect(formatter.mock.calls).toEqual([
    ['ko', {weekday: 'short'}],
    ['en', {weekday: 'short'}],
    ['en', {weekday: 'short'}],
  ])
})
