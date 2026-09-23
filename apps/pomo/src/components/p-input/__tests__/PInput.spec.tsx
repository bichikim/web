/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {PInput} from '../PInput'

it('should forward native input events, constraints, refs and reactive state', () => {
  const onInput = vi.fn()
  const onKeyDown = vi.fn()
  const onCompositionEnd = vi.fn()
  const ref = vi.fn()
  const [disabled, setDisabled] = createSignal(false)
  const [value, setValue] = createSignal('first')
  const view = render(() => (
    <PInput
      aria-label="제목"
      name="title"
      maxlength={20}
      required
      ref={ref}
      disabled={disabled()}
      value={value()}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onCompositionEnd={onCompositionEnd}
    />
  ))
  const input = view.getByRole('textbox', {name: '제목'})
  expect(ref.mock.lastCall?.[0]).toBe(input)
  expect(input).toBeRequired()
  expect(input).toHaveAttribute('maxlength', '20')
  fireEvent.input(input, {target: {value: '수정'}})
  expect(onInput.mock.lastCall?.[0].target).toBe(input)
  fireEvent.keyDown(input, {key: 'Enter'})
  expect(onKeyDown).toHaveBeenCalledOnce()
  fireEvent.compositionEnd(input)
  expect(onCompositionEnd).toHaveBeenCalledOnce()
  setValue('updated')
  expect(input).toHaveValue('updated')
  setDisabled(true)
  expect(input).toBeDisabled()
})

it('should support numeric form values and custom embedded styling', () => {
  const view = render(() => (
    <form>
      <PInput
        aria-label="개수"
        name="count"
        type="number"
        min={1}
        max={5}
        value={3}
        unstyled
        class="embedded"
      />
    </form>
  ))
  const input = view.getByRole('spinbutton')
  expect(input).toHaveValue(3)
  expect(input).toHaveClass('embedded')
  expect(input).not.toHaveClass('bg-black/20')
  expect(new FormData(input.closest('form')!).get('count')).toBe('3')
})
