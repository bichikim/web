/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'

import {EditorColorField} from '../EditorColorField'

test('should omit unchanged color commits after text entry loses focus', () => {
  const onValueChange = vi.fn()
  render(() => <EditorColorField label="색상" value="#FFFFFF" onValueChange={onValueChange} />)
  const input = screen.getByRole('textbox', {name: '색상'})
  fireEvent.focus(input)
  fireEvent.input(input, {target: {value: '#ffffff'}})
  fireEvent.blur(input)
  expect(onValueChange).not.toHaveBeenCalled()
})

test('should commit a changed color after text entry loses focus', () => {
  const [value, setValue] = createSignal('#ffffff')
  const onValueChange = vi.fn((next: string) => setValue(next))
  render(() => <EditorColorField label="색상" value={value()} onValueChange={onValueChange} />)
  const input = screen.getByRole('textbox', {name: '색상'})
  fireEvent.focus(input)
  fireEvent.input(input, {target: {value: '#ffcccc'}})
  fireEvent.blur(input)
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith('#FFCCCC')
})

test('should disable both color entry paths', () => {
  render(() => <EditorColorField label="색상" value="#000000" disabled onValueChange={vi.fn()} />)
  expect(screen.getByRole('textbox', {name: '색상'})).toBeDisabled()
  expect(screen.getByRole('button', {name: '색상 선택'})).toBeDisabled()
})
