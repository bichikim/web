/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'

import type {LocalDateRuntime} from 'src/features/civil-date'
import {Service} from '../Service'
import {PreferenceProvider} from 'src/hooks/use-preference'

const createFixedRuntime = () =>
  ({
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    schedule: () => () => undefined,
    subscribe: () => () => undefined,
  }) satisfies LocalDateRuntime

const mountService = (runtime: LocalDateRuntime) =>
  render(() => (
    <PreferenceProvider>
      <Service runtime={runtime} />
    </PreferenceProvider>
  ))

afterEach(() => localStorage.clear())

it('should persist and restore pasted service days with surrounding whitespace', async () => {
  const runtime = createFixedRuntime()
  localStorage.setItem(
    'pomo:service-settings:v1',
    JSON.stringify({branch: 'army', days: '300', manual: true, start: '2026-01-01'}),
  )
  const firstView = mountService(runtime)
  const manual = screen.getByRole('switch', {name: '복무기간 직접 입력'})

  await waitFor(() => expect(manual).toBeEnabled())
  const days = screen.getByRole('textbox', {name: /복무기간 \(일\)/u})
  fireEvent.input(days, {target: {value: ' 300 '}})

  expect(days).toHaveAttribute('aria-invalid', 'false')
  const result = screen.getByRole('region', {name: '예상 전역일'})
  expect(result).toBeVisible()
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem('pomo:service-settings:v1') ?? 'null')
    expect(saved.days).toBe(' 300 ')
  })

  const firstResult = result.textContent
  fireEvent.input(days, {target: {value: ' 301 '}})
  expect(days).toHaveAttribute('aria-invalid', 'false')
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem('pomo:service-settings:v1') ?? 'null')
    expect(saved.days).toBe(' 301 ')
    expect(result.textContent).not.toBe(firstResult)
  })
  const updatedResult = result.textContent

  firstView.unmount()
  const secondView = mountService(runtime)

  await waitFor(() => {
    expect(screen.getByRole('textbox', {name: /복무기간 \(일\)/u})).toHaveValue('301')
    expect(screen.getByRole('region', {name: '예상 전역일'}).textContent).toBe(updatedResult)
  })
  secondView.unmount()
})
