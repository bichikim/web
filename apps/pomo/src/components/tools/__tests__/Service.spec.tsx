/** @vitest-environment jsdom */
import {PreferenceContext, type PreferenceEntry} from 'src/hooks/use-preference'
import {DEFAULT_SERVICE_SETTINGS, type ServiceSettings} from 'src/features/tools'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {Service} from '../Service'

const renderService = (initial: ServiceSettings = DEFAULT_SERVICE_SETTINGS) => {
  const [snapshot, setSnapshot] = createSignal<{readonly value: unknown}>({value: initial})
  const entry: PreferenceEntry = {
    setValue: (value) => setSnapshot({value}),
    snapshot,
    subscribeErrors: () => () => undefined,
    subscribeSaves: () => () => undefined,
  }
  return render(() => (
    <PreferenceContext.Provider value={{get: () => entry}}>
      <Service />
    </PreferenceContext.Provider>
  ))
}

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})
it('should not mark valid service days invalid while the enlistment date is empty', () => {
  renderService()
  const manual = screen.getByRole('switch', {name: '복무기간 직접 입력'})
  expect(manual).toBeEnabled()
  fireEvent.click(manual)
  const days = screen.getByRole('textbox', {name: /복무기간 \(일\)/u})
  fireEvent.input(days, {target: {value: '300'}})
  expect(days).toHaveAttribute('aria-invalid', 'false')
  fireEvent.input(days, {target: {value: '0'}})
  expect(days).toHaveAttribute('aria-invalid', 'true')
})

it('should reset old enlistment dates when direct duration is disabled', () => {
  renderService({branch: 'army', days: '300', manual: true, start: '2020-01-01'})
  const manual = screen.getByRole('switch', {name: '복무기간 직접 입력'})
  expect(manual).toBeEnabled()

  expect(screen.getByRole('button', {name: '입대일: 2020-01-01'})).toBeVisible()
  expect(screen.getByRole('region', {name: '예상 전역일'})).toBeVisible()
  fireEvent.click(manual)

  expect(screen.getByRole('region', {name: '예상 전역일'})).toHaveTextContent('2023-06-30')
  expect(screen.getByRole('button', {name: '입대일: 2022-01-01'})).toBeVisible()
})

it('should keep an empty enlistment date when direct duration is disabled', () => {
  renderService({branch: 'army', days: '300', manual: true, start: ''})
  const manual = screen.getByRole('switch', {name: '복무기간 직접 입력'})
  expect(manual).toBeEnabled()

  fireEvent.click(manual)

  expect(screen.getByRole('status')).toHaveTextContent('입대일을 선택해주세요.')
})

it('should display the device date at a year boundary', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 11, 31, 23, 30))
  renderService()
  expect(screen.getByText(/현재 UTC 날짜 2026-12-31 기준/u)).toBeVisible()
})
