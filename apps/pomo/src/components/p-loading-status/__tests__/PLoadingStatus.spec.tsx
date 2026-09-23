/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {PLoadingStatus} from '../PLoadingStatus'

it('should render the loading message and spinner with component class constants', () => {
  const message = '장면 준비 중'
  render(() => <PLoadingStatus message={message} />)
  const loading = screen.getByText(message).parentElement

  expect(loading).toHaveClass('flex', 'min-h-control-sm', 'rounded-control')
  expect(loading?.querySelector('span[aria-hidden="true"]')).toHaveAttribute('aria-hidden', 'true')
  expect(screen.queryByRole('button')).toBeNull()
})

it('should run the optional cancel action', () => {
  const onCancel = vi.fn()
  render(() => <PLoadingStatus message="다운로드 준비 중" onCancel={onCancel} />)

  const cancelButton = screen.getByRole('button', {name: '취소'})
  expect(cancelButton).toHaveClass('text-sm')
  fireEvent.click(cancelButton)

  expect(onCancel).toHaveBeenCalledOnce()
})
