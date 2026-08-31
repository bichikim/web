/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {PLoadingStatus} from '../PLoadingStatus'

it('should render the loading message and spinner with the intended text weight', () => {
  const {container} = render(() => <PLoadingStatus message="장면 준비 중" />)

  expect(screen.getByText('장면 준비 중').parentElement).toHaveClass('font-650')
  expect(container.querySelector('.pomo-loading__spinner')).toHaveAttribute('aria-hidden', 'true')
  expect(screen.queryByRole('button')).toBeNull()
})

it('should run the optional cancel action', () => {
  const onCancel = vi.fn()
  render(() => <PLoadingStatus message="다운로드 준비 중" onCancel={onCancel} />)

  fireEvent.click(screen.getByRole('button', {name: '취소'}))

  expect(onCancel).toHaveBeenCalledOnce()
})
