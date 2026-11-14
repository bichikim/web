import {cleanup, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {SAlbumDeleteDialog} from '../../src/components/SAlbumDeleteDialog'
import 'virtual:uno.css'

afterEach(cleanup)

it('should block duplicate actions during deletion and retain an error for retry', async () => {
  const [error, setError] = createSignal<string | null>(null)
  const first = Promise.withResolvers<void>()
  const onDelete = vi
    .fn()
    .mockImplementationOnce(async () => {
      await first.promise
      setError('삭제하지 못했어요.')
    })
    .mockImplementationOnce(async () => {
      setError(null)
    })
  const onClose = vi.fn()
  render(() => (
    <SAlbumDeleteDialog name="mine.png" error={error()} onDelete={onDelete} onClose={onClose} />
  ))
  const confirm = screen.getByRole('button', {name: '삭제'})
  await userEvent.click(confirm)
  expect(confirm).toBeDisabled()
  expect(screen.getByRole('button', {name: '취소'})).toBeDisabled()
  await userEvent.click(screen.getByRole('button', {name: '닫기'}))
  await userEvent.keyboard('{Escape}')
  expect(onClose).not.toHaveBeenCalled()
  expect(onDelete).toHaveBeenCalledOnce()
  first.resolve()
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('삭제하지 못했어요.'))
  expect(confirm).not.toBeDisabled()
  expect(onClose).not.toHaveBeenCalled()
  await userEvent.click(confirm)
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  expect(onDelete).toHaveBeenCalledTimes(2)
})
