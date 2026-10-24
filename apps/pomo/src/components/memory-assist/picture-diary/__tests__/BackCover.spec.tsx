/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PictureDiaryBackCover} from '../BackCover'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should identify the closed cover and keep decorative content hidden from accessibility', () => {
  const view = render(() => (
    <PictureDiaryBackCover closed="front" side="current" surface="outside" />
  ))
  expect(view.container.firstElementChild).toHaveAttribute('data-picture-diary-cover', 'front')
  expect(view.container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  expect(view.container.firstElementChild).toHaveClass('picture-diary-book__back-cover--outside')
})
