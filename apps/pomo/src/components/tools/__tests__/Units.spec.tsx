/** @vitest-environment jsdom */
import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it} from 'vitest'
import {Units} from '../Units'

beforeEach(() => {
  localStorage.removeItem('pomo:tool-units:v1')
})

const renderReadyUnits = async () => {
  render(() => (
    <PreferenceProvider>
      <Units />
    </PreferenceProvider>
  ))
  await waitFor(() => expect(screen.getByRole('button', {name: '초기화'})).toBeEnabled())
}

it('should convert a changed value', async () => {
  await renderReadyUnits()
  fireEvent.input(screen.getByRole('textbox', {name: '변환할 값'}), {
    target: {value: '3'},
  })
  expect(screen.getByText('9.84251968504 ft')).toBeVisible()
})

it('should swap the selected units', async () => {
  await renderReadyUnits()
  fireEvent.input(screen.getByRole('textbox', {name: '변환할 값'}), {
    target: {value: '3'},
  })
  fireEvent.click(screen.getByRole('button', {name: '단위 맞바꾸기'}))
  expect(screen.getByText('0.9144 m')).toBeVisible()
})

it('should reject malformed input and hide the copy action', async () => {
  await renderReadyUnits()
  const input = screen.getByRole('textbox', {name: '변환할 값'})
  fireEvent.input(input, {target: {value: '1,2'}})
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(screen.queryByRole('button', {name: '결과 복사'})).not.toBeInTheDocument()
})

it('should reset the value and selected units', async () => {
  await renderReadyUnits()
  const input = screen.getByRole('textbox', {name: '변환할 값'})
  fireEvent.input(input, {target: {value: '3'}})
  fireEvent.click(screen.getByRole('button', {name: '단위 맞바꾸기'}))
  expect(screen.getByText('0.9144 m')).toBeVisible()

  fireEvent.click(screen.getByRole('button', {name: '초기화'}))
  expect(screen.getByText('3.28083989501 ft')).toBeVisible()
})
