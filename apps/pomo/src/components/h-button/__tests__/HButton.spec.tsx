/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {HButton} from '..'

it('should compose an unstyled native button with decorative parts', () => {
  const onClick = vi.fn()
  const result = render(() => (
    <HButton.Root onClick={onClick}>
      <HButton.LeadingImage src="face.webp" />
      <HButton.Icon class="custom-icon" />
      <HButton.Content>확인</HButton.Content>
    </HButton.Root>
  ))
  const button = result.getByRole('button', {name: '확인'})
  expect(button).toHaveAttribute('type', 'button')
  expect(button.className).toBe('')
  expect(result.container.querySelector('img')).toHaveAttribute('alt', '')
  expect(result.queryByRole('img')).not.toBeInTheDocument()
  fireEvent.click(button)
  expect(onClick).toHaveBeenCalledOnce()
})

it('should preserve reactive disabled state and native focus and keyboard handlers', () => {
  const [disabled, setDisabled] = createSignal(true)
  const onBlur = vi.fn()
  const onKeyDown = vi.fn()
  const result = render(() => (
    <HButton.Root
      disabled={disabled()}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      aria-label="삭제"
      type="submit"
    />
  ))
  const button = result.getByRole('button', {name: '삭제'})
  expect(button).toBeDisabled()
  setDisabled(false)
  expect(button).toBeEnabled()
  expect(button).toHaveAttribute('type', 'submit')
  fireEvent.keyDown(button, {key: 'Escape'})
  fireEvent.blur(button)
  expect(onKeyDown).toHaveBeenCalledOnce()
  expect(onBlur).toHaveBeenCalledOnce()
})
