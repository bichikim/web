/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {HConfirmButton} from '../HConfirmButton'

it('should compose caller content and confirm only on the second press', () => {
  const onConfirm = vi.fn()
  const result = render(() => (
    <HConfirmButton
      accessibleLabel="일기 삭제"
      class="consumer-style"
      confirmationAccessibleLabel="일기를 삭제하려면 한 번 더 누르세요"
      confirmationChildren={<span>한 번 더 눌러 삭제</span>}
      onConfirm={onConfirm}
    >
      <span>×</span>
    </HConfirmButton>
  ))

  const button = result.getByRole('button', {name: '일기 삭제'})
  expect(button).toHaveClass('consumer-style')
  expect(button).not.toHaveAttribute('data-confirming')

  fireEvent.click(button)
  expect(onConfirm).not.toHaveBeenCalled()
  expect(button).toHaveAttribute('data-confirming', '')
  expect(button).toHaveAccessibleName('일기를 삭제하려면 한 번 더 누르세요')
  expect(button).toHaveTextContent('한 번 더 눌러 삭제')

  fireEvent.click(button)
  expect(onConfirm).toHaveBeenCalledOnce()
  expect(button).not.toHaveAttribute('data-confirming')
})

it('should cancel the pending confirmation on blur or Escape', () => {
  const result = render(() => (
    <HConfirmButton
      accessibleLabel="일기 삭제"
      confirmationAccessibleLabel="삭제 확인"
      confirmationChildren="확인"
      onConfirm={vi.fn()}
    >
      삭제
    </HConfirmButton>
  ))
  const button = result.getByRole('button', {name: '일기 삭제'})

  fireEvent.click(button)
  fireEvent.keyDown(button, {key: 'Escape'})
  expect(button).not.toHaveAttribute('data-confirming')

  fireEvent.click(button)
  fireEvent.blur(button)
  expect(button).not.toHaveAttribute('data-confirming')
})
