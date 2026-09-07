/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PictureDiaryWritingPage} from '../WritingPage'
import {createEditorProps} from './fixtures/pages'
vi.mock('../Canvas', () => ({PictureDiaryCanvas: vi.fn()}))
vi.mock('../Drawing', () => ({PictureDiaryDrawing: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should forward date, text, and save actions and disable preview editing', () => {
  const editor = createEditorProps()
  const [preview, setPreview] = createSignal(false)
  render(() => <PictureDiaryWritingPage editor={editor} preview={preview()} />)
  const text = screen.getByRole('textbox')
  const date = screen.getByLabelText(m.picture_diary_date())
  fireEvent.input(text, {target: {value: '수정한 일기'}})
  expect(editor.onTextChange).toHaveBeenCalledWith('수정한 일기')
  fireEvent.input(date, {target: {value: '2026-09-07'}})
  expect(editor.onDateChange).toHaveBeenCalledWith('2026-09-07')
  fireEvent.click(screen.getByRole('button', {name: m.picture_diary_save()}))
  expect(editor.onSave).toHaveBeenCalledOnce()
  setPreview(true)
  expect(text).toBeDisabled()
  expect(date).toBeDisabled()
  expect(screen.getByRole('button', {name: m.picture_diary_save()})).toBeDisabled()
})
