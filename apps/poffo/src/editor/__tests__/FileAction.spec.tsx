/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {FileAction} from '../FileAction'

test('should return focus to the menu before starting the selected file operation', () => {
  const onImport = vi.fn(() =>
    expect(screen.getByRole('button', {name: '파일 메뉴'})).toHaveFocus(),
  )
  render(() => (
    <>
      <button>파일 메뉴</button>
      <FileAction
        label="불러오기"
        onClose={vi.fn()}
        onImport={onImport}
        onReturnFocus={() => screen.getByRole('button', {name: '파일 메뉴'}).focus()}
      />
    </>
  ))
  const file = new File(['{}'], 'model.json')
  fireEvent.change(screen.getByLabelText('불러오기'), {target: {files: [file]}})
  expect(onImport).toHaveBeenCalledExactlyOnceWith(file)
})
