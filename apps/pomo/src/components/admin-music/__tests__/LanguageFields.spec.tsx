/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createEmptyAlbumTranslations} from 'src/features/admin-music'
import {afterEach, expect, it, vi} from 'vitest'
import {LanguageFields} from '../LanguageFields'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should forward localized field edits and enforce required metadata', () => {
  const onFieldChange = vi.fn()
  render(() => (
    <LanguageFields
      language={{label: '한국어', locale: 'ko'}}
      required
      values={createEmptyAlbumTranslations()}
      onFieldChange={onFieldChange}
    />
  ))
  const title = screen.getByRole('textbox', {name: '앨범명'})
  const description = screen.getByRole('textbox', {name: '설명'})
  expect(title).toBeRequired()
  expect(description).toBeRequired()
  fireEvent.input(title, {target: {value: '제목'}})
  fireEvent.input(description, {target: {value: '설명 내용'}})
  expect(onFieldChange).toHaveBeenCalledWith('ko', 'title', '제목')
  expect(onFieldChange).toHaveBeenCalledWith('ko', 'description', '설명 내용')
})
