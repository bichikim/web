/** @vitest-environment jsdom */
import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {Service} from '../Service'

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})
it('should not mark valid service days invalid while the enlistment date is empty', async () => {
  localStorage.clear()
  render(() => (
    <PreferenceProvider>
      <Service />
    </PreferenceProvider>
  ))
  const manual = screen.getByRole('switch', {name: '복무기간 직접 입력'})
  await waitFor(() => expect(manual).toBeEnabled())
  fireEvent.click(manual)
  const days = screen.getByRole('textbox', {name: /복무기간 \(일\)/u})
  fireEvent.input(days, {target: {value: '300'}})
  expect(days).toHaveAttribute('aria-invalid', 'false')
  fireEvent.input(days, {target: {value: '0'}})
  expect(days).toHaveAttribute('aria-invalid', 'true')
})

it('should display the device date at a year boundary', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 11, 31, 23, 30))
  render(() => (
    <PreferenceProvider>
      <Service />
    </PreferenceProvider>
  ))
  expect(screen.getByText(/현재 기기의 날짜 2026-12-31 기준/u)).toBeVisible()
})
