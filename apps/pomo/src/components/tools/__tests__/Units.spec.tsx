/** @vitest-environment jsdom */
import {PreferenceContext, type PreferenceEntry, PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, For} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'
import type {PSelectSingleProps} from '../../p-select/PSelect'
import {Units} from '../Units'

vi.mock('../../p-select/PSelect', () => ({
  PSelect: (props: PSelectSingleProps<string>) => (
    <label>
      {props.label}
      <select
        aria-label={props.label}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        value={props.value}
      >
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
    </label>
  ),
}))

beforeEach(() => {
  localStorage.removeItem('pomo:tool-units:v1')
})

const renderUnits = () => {
  render(() => (
    <PreferenceProvider>
      <Units />
    </PreferenceProvider>
  ))
}

const renderUnitsWithSelection = () => {
  const [snapshot, setSnapshot] = createSignal<{readonly value: unknown}>({
    value: {category: 'length', from: 'm', to: 'ft'},
  })
  const entry: PreferenceEntry = {
    setValue: (value) => setSnapshot({value}),
    snapshot,
    subscribeErrors: () => () => undefined,
    subscribeSaves: () => () => undefined,
  }
  return render(() => (
    <PreferenceContext.Provider value={{get: () => entry}}>
      <Units />
    </PreferenceContext.Provider>
  ))
}

const renderReadyUnits = async () => {
  renderUnits()
  await waitFor(() => expect(screen.getByRole('button', {name: '초기화'})).toBeEnabled())
}

it('should update conversion and reject malformed input', () => {
  renderUnits()
  const input = screen.getByRole('textbox', {name: '변환할 값'})
  fireEvent.input(input, {target: {value: '3'}})
  expect(screen.getByText('9.84251968504 ft')).toBeVisible()
  fireEvent.input(input, {target: {value: '1,2'}})
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(screen.queryByRole('button', {name: '결과 복사'})).not.toBeInTheDocument()
})

it('should enable unit selection controls after restoring saved preferences', async () => {
  await renderReadyUnits()
})

it('should swap the selected units while preserving the entered value', () => {
  renderUnitsWithSelection()
  const input = screen.getByRole('textbox', {name: '변환할 값'})
  fireEvent.input(input, {target: {value: '3'}})
  fireEvent.click(screen.getByRole('button', {name: '단위 맞바꾸기'}))
  expect(screen.getByText('0.9144 m')).toBeVisible()
})

it('should reset the value and unit selection', async () => {
  await renderReadyUnits()
  const input = screen.getByRole('textbox', {name: '변환할 값'})
  fireEvent.input(input, {target: {value: '3'}})
  fireEvent.click(screen.getByRole('button', {name: '초기화'}))
  expect(screen.getByText('3.28083989501 ft')).toBeVisible()
})
