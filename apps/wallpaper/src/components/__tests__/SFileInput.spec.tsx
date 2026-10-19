/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {SFileInput} from '../SFileInput'

afterEach(cleanup)

it('should open the hidden picker and allow importing the same file again', () => {
  const onFiles = vi.fn()
  const {container} = render(() => <SFileInput label="Import" accept=".json" onFiles={onFiles} />)
  const trigger = screen.getByRole('button', {name: 'Import'})
  // The native picker intentionally has no accessible role in the custom control.
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
  const click = vi.spyOn(input, 'click')
  fireEvent.click(trigger)
  expect(click).toHaveBeenCalledTimes(1)
  const file = new File(['{}'], 'model.json', {type: 'application/json'})
  fireEvent.change(input, {target: {files: [file]}})
  fireEvent.change(input, {target: {files: [file]}})
  expect(onFiles).toHaveBeenCalledTimes(2)
  expect(onFiles).toHaveBeenLastCalledWith([file])
  expect(screen.getByText('model.json')).toBeVisible()
  expect(input.value).toBe('')
  expect(trigger).toHaveFocus()
})

it('should ignore cancellation and prevent opening or importing while busy', () => {
  const onFiles = vi.fn()
  const [disabled, setDisabled] = createSignal(false)
  const {container} = render(() => (
    <SFileInput label="Import" disabled={disabled()} onFiles={onFiles} />
  ))
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
  const click = vi.spyOn(input, 'click')
  fireEvent.change(input, {target: {files: []}})
  setDisabled(true)
  fireEvent.click(screen.getByRole('button'))
  fireEvent.change(input, {target: {files: [new File(['{}'], 'model.json')]}})
  expect(click).not.toHaveBeenCalled()
  expect(onFiles).not.toHaveBeenCalled()
  expect(screen.queryByText('model.json')).toBeNull()
})
