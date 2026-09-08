/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {EditorSelect} from '../EditorSelect'

test('should display option labels while returning the stable option ID', async () => {
  const change = vi.fn()
  render(() => (
    <EditorSelect
      label="기준"
      options={['x', 'y']}
      value="x"
      optionLabel={(value) => (value === 'x' ? 'Angle X' : 'Angle Y')}
      onChange={change}
    />
  ))
  const trigger = screen.getByRole('button', {name: /기준/})
  expect(trigger).toHaveTextContent('Angle X')
  fireEvent.keyDown(trigger, {key: 'ArrowDown'})
  const option = await screen.findByRole('option', {name: 'Angle Y'})
  fireEvent.click(option)
  expect(change).toHaveBeenCalledWith('y')
})

test('should allow an empty selection when formatting option labels', () => {
  const view = render(() => (
    <EditorSelect label="기준" options={['x']} optionLabel={(value) => value.toUpperCase()} />
  ))
  expect(view.getByRole('button', {name: '기준'})).toBeEnabled()
})
