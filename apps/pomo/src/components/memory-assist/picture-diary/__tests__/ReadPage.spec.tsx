/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PictureDiaryReadPage} from '../ReadPage'
import {ENTRY} from './fixtures/pages'
vi.mock('../Canvas', () => ({PictureDiaryCanvas: vi.fn()}))
vi.mock('../Drawing', () => ({PictureDiaryDrawing: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should show the saved entry and forward editing and confirmed deletion', () => {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  render(() => (
    <PictureDiaryReadPage entry={ENTRY} onEdit={onEdit} onDelete={onDelete} side="current" />
  ))
  expect(screen.getByText('산책한 날')).toBeVisible()
  expect(screen.getByText('2026. 09. 06.')).toHaveAttribute('datetime', '2026-09-06')
  fireEvent.click(screen.getByRole('button', {name: m.picture_diary_edit_entry()}))
  expect(onEdit).toHaveBeenCalledWith(ENTRY)
  fireEvent.click(
    screen.getByRole('button', {name: m.picture_diary_delete_entry({date: '2026. 09. 06.'})}),
  )
  expect(onDelete).not.toHaveBeenCalled()
  fireEvent.click(
    screen.getByRole('button', {
      name: m.picture_diary_delete_confirm_label({date: '2026. 09. 06.'}),
    }),
  )
  expect(onDelete).toHaveBeenCalledWith('entry')
})
