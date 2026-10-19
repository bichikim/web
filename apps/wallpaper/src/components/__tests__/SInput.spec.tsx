/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {SInput} from '../SInput'

afterEach(cleanup)

it('should commit a URL once on Enter and retain the saved value until its parent updates', () => {
  const onChange = vi.fn()
  const [value, setValue] = createSignal('https://old.example')
  render(() => <SInput label="URL" type="url" value={value()} onChange={onChange} />)
  const input = screen.getByRole('textbox', {name: 'URL'})
  fireEvent.input(input, {target: {value: 'https://new.example'}})
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.keyDown(input, {key: 'Enter'})
  fireEvent.blur(input)
  expect(onChange).toHaveBeenCalledExactlyOnceWith('https://new.example')
  expect(input).toHaveValue('https://old.example')
  setValue('https://new.example')
  expect(input).toHaveValue('https://new.example')
})

it('should cancel edits on Escape and ignore composing Enter', () => {
  const onChange = vi.fn()
  render(() => <SInput label="URL" value="original" onChange={onChange} />)
  const input = screen.getByRole('textbox')
  fireEvent.input(input, {target: {value: 'draft'}})
  fireEvent.keyDown(input, {isComposing: true, key: 'Enter'})
  expect(onChange).not.toHaveBeenCalled()
  expect(input).toHaveValue('draft')
  fireEvent.keyDown(input, {key: 'Escape'})
  fireEvent.blur(input)
  expect(input).toHaveValue('original')
  expect(onChange).not.toHaveBeenCalled()
})

it('should commit on blur and keep a busy input focusable without allowing edits', () => {
  const onChange = vi.fn()
  const [disabled, setDisabled] = createSignal(false)
  render(() => <SInput label="URL" disabled={disabled()} onChange={onChange} />)
  const input = screen.getByRole('textbox')
  fireEvent.input(input, {target: {value: 'draft'}})
  fireEvent.blur(input)
  expect(input).toHaveValue('draft')
  expect(onChange).toHaveBeenCalledExactlyOnceWith('draft')
  setDisabled(true)
  input.focus()
  expect(input).toHaveFocus()
  expect(input).toHaveAttribute('readonly')
  fireEvent.keyDown(input, {key: 'Enter'})
  expect(onChange).toHaveBeenCalledTimes(1)
})
