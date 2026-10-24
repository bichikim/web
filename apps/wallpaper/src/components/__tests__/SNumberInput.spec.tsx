/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SNumberInput} from '../SNumberInput'

afterEach(cleanup)

it('should commit a typed value on blur and constrain it to the supplied bounds', () => {
  const onChange = vi.fn()
  render(() => <SNumberInput label="Seconds" value={10} min={1} max={30} onChange={onChange} />)
  const input = screen.getByRole('spinbutton', {name: 'Seconds'})
  fireEvent.input(input, {target: {value: '50'}})
  fireEvent.blur(input)
  expect(onChange).toHaveBeenCalledWith(30)
})

it('should discard invalid drafts and let Escape cancel a valid draft', () => {
  const onChange = vi.fn()
  render(() => <SNumberInput label="Seconds" value={10} onChange={onChange} />)
  const input = screen.getByRole('spinbutton')
  fireEvent.input(input, {target: {value: 'invalid'}})
  fireEvent.blur(input)
  expect(input).toHaveValue('10')
  fireEvent.input(input, {target: {value: '20'}})
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(input).toHaveValue('10')
  expect(onChange).not.toHaveBeenCalled()
})

it('should provide custom step controls and keyboard stepping with decimal precision', () => {
  render(() => <SNumberInput label="Seconds" step={0.1} min={0} max={1} />)
  const input = screen.getByRole('spinbutton')
  fireEvent.click(screen.getByRole('button', {name: 'Seconds 늘리기'}))
  fireEvent.keyDown(input, {key: 'ArrowUp'})
  fireEvent.keyDown(input, {key: 'ArrowUp'})
  expect(input).toHaveValue('0.3')
  fireEvent.keyDown(input, {key: 'ArrowDown'})
  expect(input).toHaveValue('0.2')
})

it('should prevent editing and stepping while disabled', () => {
  const onChange = vi.fn()
  render(() => <SNumberInput label="Seconds" value={10} disabled onChange={onChange} />)
  const input = screen.getByRole('spinbutton')
  expect(input).toHaveAttribute('readonly')
  fireEvent.keyDown(input, {key: 'ArrowUp'})
  fireEvent.click(screen.getByRole('button', {name: 'Seconds 늘리기'}))
  expect(onChange).not.toHaveBeenCalled()
})
