/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {PTextarea} from '../PTextarea'

it('should preserve multiline values, native events, refs and read-only state', () => {
  const onInput = vi.fn()
  const onKeyDown = vi.fn()
  const ref = vi.fn()
  const [readOnly, setReadOnly] = createSignal(false)
  const view = render(() => (
    <PTextarea
      aria-label="일기"
      rows={4}
      maxlength={2000}
      ref={ref}
      readOnly={readOnly()}
      value={'첫 줄\n둘째 줄'}
      onInput={onInput}
      onKeyDown={onKeyDown}
    />
  ))
  const input = view.getByRole('textbox', {name: '일기'})
  expect(input.tagName).toBe('TEXTAREA')
  expect(input).toHaveValue('첫 줄\n둘째 줄')
  expect(input).toHaveAttribute('rows', '4')
  expect(ref.mock.lastCall?.[0]).toBe(input)
  fireEvent.input(input, {target: {value: '변경\n내용'}})
  expect(onInput.mock.lastCall?.[0].target).toBe(input)
  fireEvent.keyDown(input, {key: 'Enter', shiftKey: true})
  expect(onKeyDown).toHaveBeenCalledOnce()
  setReadOnly(true)
  expect(input).toHaveAttribute('readonly')
})
