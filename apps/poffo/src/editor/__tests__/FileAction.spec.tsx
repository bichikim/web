/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {FileAction} from '../FileAction'

test('should advertise the native Poffo extension to the native file picker', () => {
  render(() => <FileAction label="불러오기" onClose={vi.fn()} onImport={vi.fn()} />)
  const input = screen.getByLabelText<HTMLInputElement>('불러오기')
  expect(input.accept.split(',')).toContain('.poffo')
  expect(input.accept.split(',')).not.toContain('.br')
  expect(input.accept.split(',')).not.toContain('.json.br')
})

test('should preserve an explicitly restricted file picker', () => {
  render(() => (
    <FileAction
      label="PSD 재가져오기"
      accept=".psd,image/vnd.adobe.photoshop"
      onClose={vi.fn()}
      onImport={vi.fn()}
    />
  ))
  expect(screen.getByLabelText<HTMLInputElement>('PSD 재가져오기').accept).toBe(
    '.psd,image/vnd.adobe.photoshop',
  )
})

test.each(['model.poffo', 'MODEL.POFFO'])(
  'should pass the selected compressed document %s to the import operation',
  (name) => {
    const onImport = vi.fn()
    render(() => <FileAction label="불러오기" onClose={vi.fn()} onImport={onImport} />)
    const file = new File(['compressed'], name, {type: 'application/octet-stream'})
    fireEvent.change(screen.getByLabelText('불러오기'), {target: {files: [file]}})
    expect(onImport).toHaveBeenCalledExactlyOnceWith(file)
  },
)

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
