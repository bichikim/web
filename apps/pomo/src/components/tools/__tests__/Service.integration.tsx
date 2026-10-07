/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'

import {Service} from '../Service'
import {PreferenceProvider} from 'src/hooks/use-preference'

const mountService = () =>
  render(() => (
    <PreferenceProvider>
      <Service />
    </PreferenceProvider>
  ))

afterEach(() => localStorage.clear())

it('should persist and restore pasted service days with surrounding whitespace', async () => {
  localStorage.setItem(
    'pomo:service-settings:v1',
    JSON.stringify({branch: 'army', days: '300', manual: true, start: '2026-01-01'}),
  )
  const firstView = mountService()
  const manual = screen.getByRole('switch', {name: '복무기간 직접 입력'})

  await waitFor(() => expect(manual).toBeEnabled())
  const days = screen.getByRole('textbox', {name: /복무기간 \(일\)/u})
  fireEvent.input(days, {target: {value: ' 300 '}})

  expect(days).toHaveAttribute('aria-invalid', 'false')
  expect(screen.getByRole('region', {name: '예상 전역일'})).toBeVisible()
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem('pomo:service-settings:v1') ?? 'null')
    expect(saved.days).toBe(' 300 ')
  })

  firstView.unmount()
  mountService()

  await waitFor(() => {
    expect(screen.getByRole('textbox', {name: /복무기간 \(일\)/u})).toHaveValue('300')
    expect(screen.getByRole('region', {name: '예상 전역일'})).toBeVisible()
  })
})
