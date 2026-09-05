/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import {EditorToolbar} from '../EditorToolbar'

test('should group file and history actions in the main menu', () => {
  const onExport = vi.fn()
  const onPngImport = vi.fn()
  const view = render(() => (
    <EditorToolbar
      playerStatus="ready"
      onExport={onExport}
      onJsonImport={vi.fn()}
      onPngImport={onPngImport}
    />
  ))
  const trigger = view.getByRole('button', {name: '메인 메뉴'})
  const menu = view.container.querySelector('[popover="auto"]')
  expect(trigger).toHaveAttribute('popovertarget', menu?.id)
  expect(menu).toContainElement(view.getByRole('button', {name: 'JSON 내보내기'}))
  fireEvent.click(view.getByRole('button', {name: 'JSON 내보내기'}))
  expect(onExport).toHaveBeenCalledOnce()
  const file = new File(['png'], 'part.png', {type: 'image/png'})
  fireEvent.change(view.getByLabelText('PNG 불러오기'), {target: {files: [file]}})
  expect(onPngImport).toHaveBeenCalledWith(file)
  expect(menu).toContainElement(view.getByRole('button', {name: '실행 취소'}))
  expect(menu).toContainElement(view.getByRole('button', {name: '다시 실행'}))
  expect(view.getByRole('button', {name: '실행 취소'})).toBeDisabled()
  expect(view.getByRole('button', {name: '다시 실행'})).toBeDisabled()
  expect(view.getByRole('navigation', {name: '편집 작업 공간'}).nextElementSibling).toHaveClass(
    'panel-visibility-controls',
  )
})

test('should invoke available undo and redo actions from the menu', () => {
  const onUndo = vi.fn()
  const onRedo = vi.fn()
  const view = render(() => (
    <EditorToolbar
      canUndo
      canRedo
      playerStatus="ready"
      onUndo={onUndo}
      onRedo={onRedo}
      onExport={vi.fn()}
      onJsonImport={vi.fn()}
      onPngImport={vi.fn()}
    />
  ))
  fireEvent.click(view.getByRole('button', {name: '실행 취소'}))
  fireEvent.click(view.getByRole('button', {name: '다시 실행'}))
  expect(onUndo).toHaveBeenCalledOnce()
  expect(onRedo).toHaveBeenCalledOnce()
})
