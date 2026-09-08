/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {Service} from '../Service'

afterEach(() => localStorage.clear())
it('should not mark valid service days invalid while the enlistment date is empty', async () => {
  localStorage.clear()
  render(() => <Service />)
  const manual = screen.getByRole('switch', {name: '복무기간 직접 입력'})
  await waitFor(() => expect(manual).toBeEnabled())
  fireEvent.click(manual)
  const days = screen.getByRole('textbox', {name: /복무기간 \(일\)/u})
  fireEvent.input(days, {target: {value: '300'}})
  expect(days).toHaveAttribute('aria-invalid', 'false')
  fireEvent.input(days, {target: {value: '0'}})
  expect(days).toHaveAttribute('aria-invalid', 'true')
})
