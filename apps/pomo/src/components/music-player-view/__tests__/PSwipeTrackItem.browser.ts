import {render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {PSwipeTrackItem} from '../PSwipeTrackItem'

it('should allow keyboard selection after a horizontal pointer gesture is cancelled', async () => {
  const onSelect = vi.fn()
  const onRemove = vi.fn()
  render(() =>
    createComponent(PSwipeTrackItem, {
      current: false,
      index: 0,
      onRemove,
      onSelect,
      track: {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
    }),
  )
  const button = page.getByRole('button', {name: /One · Artist/u}).element() as HTMLButtonElement
  button.focus()
  button.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 1}))
  button.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, clientX: 65, pointerId: 1}))
  expect(button).toHaveAttribute('data-swipe-delete-ready')
  button.dispatchEvent(new PointerEvent('pointercancel', {bubbles: true, pointerId: 1}))
  expect(button).not.toHaveAttribute('data-swipe-delete-ready')

  await userEvent.keyboard('{Enter}')

  expect(onSelect).toHaveBeenCalledOnce()
  expect(onRemove).not.toHaveBeenCalled()
})
