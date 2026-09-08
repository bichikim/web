/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it} from 'vitest'
import {Units} from '../Units'

it('should update conversion, swap units and reject malformed input', async () => {
  render(() => <Units />)
  await waitFor(() => expect(screen.getByRole('button', {name: '초기화'})).toBeEnabled())
  const input = screen.getByRole('textbox', {name: '변환할 값'})
  fireEvent.input(input, {target: {value: '3'}})
  expect(screen.getByText('9.84251968504 ft')).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '단위 맞바꾸기'}))
  expect(screen.getByText('0.9144 m')).toBeVisible()
  fireEvent.input(input, {target: {value: '1,2'}})
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(screen.queryByRole('button', {name: '결과 복사'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '초기화'}))
  expect(screen.getByText('3.28083989501 ft')).toBeVisible()
})
