/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {DesktopDialogFrame} from '../Frame'

it('should render a titled draggable frame and close it from the header', () => {
  const onClose = vi.fn()

  render(() => (
    <DesktopDialogFrame onClose={onClose} title="설정">
      <p>내용</p>
    </DesktopDialogFrame>
  ))

  const main = screen.getByRole('main')
  expect(main).toHaveClass('pomo-desktop-dialog', 'rounded-panel')
  expect(screen.getByRole('heading', {name: '설정'})).toBeInTheDocument()
  expect(screen.getByText('내용')).toBeInTheDocument()
  expect(screen.getByRole('heading').parentElement).toHaveAttribute('data-tauri-drag-region')

  fireEvent.click(screen.getByRole('button'))

  expect(onClose).toHaveBeenCalledOnce()
})
