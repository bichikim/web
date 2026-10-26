/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {getUnits, unitSelectionStorage} from 'src/features/tools'
import {Units} from '../Units'

const originalLocale = getLocale
const renderUnits = () =>
  render(() => (
    <PreferenceProvider>
      <Units />
    </PreferenceProvider>
  ))
const storedSelection = () => JSON.parse(localStorage.getItem('pomo:tool-units:v1') ?? 'null')
afterEach(() => {
  cleanup()
  overwriteGetLocale(originalLocale)
  localStorage.removeItem('pomo:tool-units:v1')
})

it.each([
  {expected: '3.30578512397 m²', from: 'pyeong', to: 'm2'},
  {expected: '0.3025 평', from: 'm2', to: 'pyeong'},
])('retains stored $from → $to through Korean and English remounts', async (selection) => {
  const {from, to, expected} = selection
  const stored = {category: 'area', from, to} as const
  overwriteGetLocale(() => 'ko')
  await unitSelectionStorage.write(stored)
  renderUnits()
  await waitFor(() => expect(screen.getByText(expected)).toBeVisible())
  cleanup()
  overwriteGetLocale(() => 'en')
  renderUnits()
  await waitFor(() => expect(screen.getByRole('button', {name: 'Reset'})).toBeEnabled())
  expect(screen.getByText(expected)).toBeVisible()
  expect(screen.getByRole('button', {name: /평/})).toBeVisible()
  expect(storedSelection()).toEqual(stored)
  cleanup()
  overwriteGetLocale(() => 'ko')
  renderUnits()
  await waitFor(() => expect(screen.getByText(expected)).toBeVisible())
  expect(storedSelection()).toEqual(stored)
})

it('swaps a retained unit and restores that explicit choice after remount', async () => {
  overwriteGetLocale(() => 'en')
  await unitSelectionStorage.write({category: 'area', from: 'pyeong', to: 'm2'})
  renderUnits()
  await waitFor(() => expect(screen.getByText('3.30578512397 m²')).toBeVisible())
  fireEvent.click(screen.getByRole('button', {name: 'Swap units'}))
  await waitFor(() => expect(screen.getByText('0.3025 평')).toBeVisible())
  await waitFor(() =>
    expect(storedSelection()).toEqual({category: 'area', from: 'm2', to: 'pyeong'}),
  )
  cleanup()
  renderUnits()
  await waitFor(() => expect(screen.getByText('0.3025 평')).toBeVisible())
})

it('keeps the ordinary English area choices unchanged without a retained pyeong', async () => {
  overwriteGetLocale(() => 'en')
  expect(getUnits('area', 'en').map((unit) => unit.id)).not.toContain('pyeong')
  await unitSelectionStorage.write({category: 'area', from: 'm2', to: 'ft2'})
  renderUnits()
  await waitFor(() => expect(screen.getByText('10.7639104167 ft²')).toBeVisible())
  expect(screen.queryByRole('button', {name: /평/})).not.toBeInTheDocument()
  expect(storedSelection()).toEqual({category: 'area', from: 'm2', to: 'ft2'})
})
