/** @vitest-environment jsdom */
import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import {EditorToolbar} from '../EditorToolbar'

test('should group file and history actions in the main menu', () => {
  const onExport = vi.fn()
  const onFileImport = vi.fn()
  const onFileOpen = vi.fn()
  const view = render(() => (
    <EditorToolbar
      playerStatus="ready"
      onExport={onExport}
      onFileImport={onFileImport}
      onFileOpen={onFileOpen}
    />
  ))
  const trigger = view.getByRole('button', {name: '메인 메뉴'})
  const menu = screen.getByLabelText('파일 및 편집 작업')
  expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
  expect(menu).toContainElement(screen.getByRole('button', {name: 'JSON 내보내기'}))
  fireEvent.click(screen.getByRole('button', {name: 'JSON 내보내기'}))
  expect(onExport).toHaveBeenCalledOnce()
  const file = new File(['png'], 'part.png', {type: 'image/png'})
  fireEvent.change(screen.getByLabelText('가져오기'), {target: {files: [file]}})
  expect(onFileImport).toHaveBeenCalledWith(file)
  const psd = new File(['psd'], 'layers.psd')
  fireEvent.change(screen.getByLabelText('불러오기'), {target: {files: [psd]}})
  expect(onFileOpen).toHaveBeenCalledWith(psd)
  expect(menu).toContainElement(screen.getByRole('button', {name: '실행 취소'}))
  expect(menu).toContainElement(screen.getByRole('button', {name: '다시 실행'}))
  expect(screen.getByRole('button', {name: '실행 취소'})).toBeDisabled()
  expect(screen.getByRole('button', {name: '다시 실행'})).toBeDisabled()
  expect(view.getByRole('group', {name: '편집 작업 공간'}).nextElementSibling).toHaveClass(
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
      onFileImport={vi.fn()}
      onFileOpen={vi.fn()}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))
  fireEvent.click(screen.getByRole('button', {name: '다시 실행'}))
  expect(onUndo).toHaveBeenCalledOnce()
  expect(onRedo).toHaveBeenCalledOnce()
})

test('should expose the retained JSON file for retrying a download', () => {
  render(() => (
    <EditorToolbar
      exportUrl="blob:retained-model"
      playerStatus="ready"
      onExport={vi.fn()}
      onFileImport={vi.fn()}
      onFileOpen={vi.fn()}
    />
  ))
  const link = screen.getByRole('link', {name: 'JSON 파일 다시 다운로드'})
  expect(link).toHaveAttribute('href', 'blob:retained-model')
  expect(link).toHaveAttribute('download', 'puppet-model.json')
})

test('should show development examples in the main menu and open the selected example', () => {
  const onExampleOpen = vi.fn()
  const character = {label: '캐릭터', load: vi.fn()}
  const simple = {label: '단순 3개 파츠', load: vi.fn()}
  render(() => (
    <EditorToolbar
      examples={[character, simple]}
      playerStatus="ready"
      onExampleOpen={onExampleOpen}
      onExport={vi.fn()}
      onFileImport={vi.fn()}
      onFileOpen={vi.fn()}
    />
  ))

  fireEvent.click(screen.getByText('예제'))
  fireEvent.click(screen.getByRole('button', {name: '단순 3개 파츠'}))
  expect(onExampleOpen).toHaveBeenCalledWith(simple)
})

test('should omit the examples entry without development examples', () => {
  render(() => (
    <EditorToolbar
      playerStatus="ready"
      onExport={vi.fn()}
      onFileImport={vi.fn()}
      onFileOpen={vi.fn()}
    />
  ))

  const menu = screen.getAllByLabelText('파일 및 편집 작업').at(-1)!
  expect(within(menu).queryByText('예제')).not.toBeInTheDocument()
})
