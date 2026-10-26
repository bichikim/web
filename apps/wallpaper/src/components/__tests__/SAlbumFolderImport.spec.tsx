/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {SAlbumFolderImport} from '../SAlbumFolderImport'

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
    },
  })
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.restoreAllMocks()
})

const photo = (path: string) => {
  const file = new File(['photo'], path.split('/').at(-1)!, {type: 'image/png'})
  Object.defineProperty(file, 'webkitRelativePath', {value: path})
  return file
}

const openPicker = () => {
  const trigger = screen.getByRole('button', {name: '사진 폴더 추가'})
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog', {name: '사진 폴더 추가'})
  return {dialog, input: dialog.querySelector<HTMLInputElement>('input[type="file"]')!, trigger}
}

it('should import photos from every subfolder by default and restore focus after selection', () => {
  const onFiles = vi.fn()
  render(() => <SAlbumFolderImport onFiles={onFiles} />)
  const {input, trigger} = openPicker()
  expect(input).toHaveAttribute('webkitdirectory')
  const files = [photo('album/root.png'), photo('album/a/b/deep.png')]
  fireEvent.change(input, {target: {files}})
  expect(onFiles).toHaveBeenCalledExactlyOnceWith(files)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(trigger).toHaveFocus()
})

it('should import only photos within the selected maximum depth', () => {
  const onFiles = vi.fn()
  render(() => <SAlbumFolderImport onFiles={onFiles} />)
  const {input} = openPicker()
  fireEvent.click(screen.getByRole('checkbox', {name: '하위 폴더 모두 포함'}))
  const depth = screen.getByRole('spinbutton', {name: '최대 깊이'})
  fireEvent.input(depth, {target: {value: '0'}})
  fireEvent.blur(depth)
  const root = photo('album/root.png')
  fireEvent.change(input, {target: {files: [root, photo('album/sub/deep.png')]}})
  expect(onFiles).toHaveBeenCalledExactlyOnceWith([root])
})

it('should keep the dialog open on cancellation or no matching photos without importing', () => {
  const onFiles = vi.fn()
  render(() => <SAlbumFolderImport onFiles={onFiles} />)
  const {input, dialog} = openPicker()
  fireEvent.change(input, {target: {files: []}})
  expect(screen.queryByRole('alert')).toBeNull()
  fireEvent.change(input, {target: {files: [new File(['text'], 'note.txt', {type: 'text/plain'})]}})
  expect(screen.getByRole('alert')).toHaveTextContent('지정한 깊이에 가져올 사진이 없어요.')
  expect(dialog).toBeVisible()
  expect(onFiles).not.toHaveBeenCalled()
  fireEvent(dialog, new Event('cancel', {cancelable: true}))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('should prevent folder selection while another import is running', () => {
  render(() => <SAlbumFolderImport disabled />)
  const trigger = screen.getByRole('button', {name: '사진 폴더 추가'})
  expect(trigger).toBeDisabled()
  fireEvent.click(trigger)
  expect(screen.queryByRole('dialog')).toBeNull()
})
