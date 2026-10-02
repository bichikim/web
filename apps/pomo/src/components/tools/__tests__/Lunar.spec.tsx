/** @vitest-environment jsdom */
import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {Lunar} from '../Lunar'

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

const renderLunar = () =>
  render(() => (
    <PreferenceProvider>
      <Lunar />
    </PreferenceProvider>
  ))

const renderLunarInLunarMode = () => {
  localStorage.setItem('pomo:tool-lunar-direction:v1', '"lunar"')
  return renderLunar()
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

const changeHiddenSelect = async (label: RegExp, value: string) => {
  const trigger = screen.getByRole('button', {name: label})
  const field = trigger.closest('[role="group"]')
  if (!(field instanceof HTMLElement)) {
    throw new Error(`Could not find the ${label} select field.`)
  }
  const select = within(field).getByRole('listbox', {hidden: true})
  fireEvent.change(select, {target: {value}})
  await Promise.resolve()
}

describe('solar-to-lunar conversion', () => {
  beforeEach(async () => {
    vi.useFakeTimers({toFake: ['Date']})
    vi.setSystemTime(new Date('2026-02-17T12:00:00Z'))
    localStorage.clear()
    renderLunar()
    await waitFor(() => expect(screen.getByRole('button', {name: /변환 방향/u})).toBeEnabled())
    fireEvent.click(screen.getByRole('button', {name: '양력 날짜: 날짜 선택'}))
  })

  it('should convert the selected solar new year date to the lunar new year', () => {
    expect(screen.getByText('날짜를 선택해주세요.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', {name: '2026-02-17'}))
    expect(screen.getByText('2026년 1월 1일')).toBeVisible()
  })
})

it('should restore lunar-to-solar direction and reject a nonexistent leap month', async () => {
  renderLunarInLunarMode()
  expect(await screen.findByText('2026-02-17')).toBeVisible()
  fireEvent.click(screen.getByRole('switch', {name: '윤달'}))
  expect(screen.getByText('존재하지 않는 날짜·윤달입니다.')).toBeVisible()
  expect(screen.queryByRole('button', {name: '결과 복사'})).not.toBeInTheDocument()
})

it('should report unsupported converter dates separately from nonexistent lunar dates', async () => {
  renderLunarInLunarMode()
  expect(await screen.findByText('2026-02-17')).toBeVisible()
  await changeHiddenSelect(/음력 연도/u, '2050')
  await changeHiddenSelect(/음력 월/u, '12')
  expect(screen.getByText('지원 범위를 벗어난 날짜입니다.')).toBeVisible()
  expect(screen.queryByText('존재하지 않는 날짜·윤달입니다.')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: /음력 일/u})).not.toBeInTheDocument()
})

describe('lunar-to-solar date selection', () => {
  it('should render only converter-supported days at the 2050 cutoff', async () => {
    renderLunarInLunarMode()
    expect(await screen.findByText('2026-02-17')).toBeVisible()
    await changeHiddenSelect(/음력 연도/u, '2050')
    expect(screen.getByRole('button', {name: /음력 연도/u})).toHaveTextContent('2050')
    await changeHiddenSelect(/음력 월/u, '11')
    expect(screen.getByRole('button', {name: /음력 월/u})).toHaveTextContent('11')
    expect(screen.getByText(/음력 2050년은 11월 18일까지 변환할 수 있습니다/u)).toBeVisible()

    await openSelect(/음력 일/u)
    const dayListbox = screen.getByRole('listbox', {name: '음력 일'})
    const options = within(dayListbox).getAllByRole('option')
    expect(options.map((option) => option.textContent?.trim())).toEqual(
      Array.from({length: 18}, (_, index) => String(index + 1)),
    )
  })

  it('should reduce a 30-day selection when the year and month change', async () => {
    renderLunarInLunarMode()
    expect(await screen.findByText('2026-02-17')).toBeVisible()

    await selectOption(/음력 일/u, '30')
    await changeHiddenSelect(/음력 연도/u, '2050')
    await changeHiddenSelect(/음력 월/u, '11')

    expect(screen.getByRole('button', {name: /음력 연도/u})).toHaveTextContent('2050')
    expect(screen.getByRole('button', {name: /음력 월/u})).toHaveTextContent('11')
    expect(screen.getByRole('button', {name: /음력 일/u})).toHaveTextContent('18')
    expect(screen.getByText('2050-12-31')).toBeVisible()
  })

  it('should update the day options and conversion when toggling a leap month', async () => {
    renderLunarInLunarMode()
    expect(await screen.findByText('2026-02-17')).toBeVisible()
    await changeHiddenSelect(/음력 연도/u, '1900')
    await changeHiddenSelect(/음력 월/u, '8')
    await changeHiddenSelect(/음력 일/u, '30')
    expect(screen.getByText('1900-09-23')).toBeVisible()

    fireEvent.click(screen.getByRole('switch', {name: '윤달'}))

    expect(screen.getByRole('button', {name: /음력 일/u})).toHaveTextContent('29')
    expect(screen.getByText('1900-10-22')).toBeVisible()
    await openSelect(/음력 일/u)
    const dayListbox = screen.getByRole('listbox', {name: '음력 일'})
    expect(within(dayListbox).getByRole('option', {name: '29'})).toBeVisible()
    expect(within(dayListbox).queryByRole('option', {name: '30'})).not.toBeInTheDocument()
  })
})
