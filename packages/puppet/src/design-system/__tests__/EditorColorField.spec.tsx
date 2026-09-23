/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'

import {EditorColorField} from '../EditorColorField'

test('should update the color from hex input and expose a dismissible picker', () => {
  const onValueChange = vi.fn()
  const [value, setValue] = createSignal('#ffffff')
  render(() => (
    <EditorColorField
      label="곱하기 색상"
      value={value()}
      onValueChange={(next) => {
        onValueChange(next)
        setValue(next)
      }}
    />
  ))
  const input = screen.getByRole('textbox', {name: '곱하기 색상'})
  fireEvent.input(input, {target: {value: '#ff0000'}})
  fireEvent.change(input, {target: {value: '#ff0000'}})
  fireEvent.blur(input)
  expect(onValueChange).toHaveBeenCalledWith('#FF0000')
  fireEvent.click(screen.getByRole('button', {name: '곱하기 색상 선택'}))
  expect(screen.getByRole('dialog', {name: '곱하기 색상'})).toBeVisible()
  expect(screen.getByLabelText(/^채도,/)).toBeDefined()
  fireEvent.click(screen.getByRole('button', {name: '색상 선택기 닫기'}))
  expect(screen.getByRole('button', {name: '곱하기 색상 선택'})).toHaveAttribute(
    'aria-expanded',
    'false',
  )
})

test('should disable both color entry paths', () => {
  render(() => <EditorColorField label="색상" value="#000000" disabled onValueChange={vi.fn()} />)
  expect(screen.getByRole('textbox', {name: '색상'})).toBeDisabled()
  expect(screen.getByRole('button', {name: '색상 선택'})).toBeDisabled()
})
