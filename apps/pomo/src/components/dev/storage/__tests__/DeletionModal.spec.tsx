/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {DeletionModal} from '../DeletionModal'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should present the requested deletion and forward confirmation or cancellation', () => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const [disabled, setDisabled] = createSignal(false)
  render(() => (
    <DeletionModal
      disabled={disabled()}
      onCancel={onCancel}
      onCloseAutoFocus={vi.fn()}
      onConfirm={onConfirm}
      request={{kind: 'cache', label: '전체 캐시'}}
    />
  ))
  expect(screen.getByRole('dialog')).toHaveTextContent('전체 캐시')
  fireEvent.click(screen.getByRole('button', {name: '삭제 확정'}))
  expect(onConfirm).toHaveBeenCalledOnce()
  setDisabled(true)
  expect(screen.getByRole('button', {name: '삭제 확정'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '취소'}))
  expect(onCancel).toHaveBeenCalledOnce()
})
