/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
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
  const menuContent = within(menu)
  const exportButton = menuContent.getByRole('button', {name: 'JSON 내보내기'})
  const undoButton = menuContent.getByRole('button', {name: '실행 취소'})
  const redoButton = menuContent.getByRole('button', {name: '다시 실행'})
  expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
  expect(menu).toContainElement(exportButton)
  fireEvent.click(exportButton)
  expect(onExport).toHaveBeenCalledOnce()
  const file = new File(['png'], 'part.png', {type: 'image/png'})
  fireEvent.change(menuContent.getByLabelText('가져오기'), {target: {files: [file]}})
  expect(onFileImport).toHaveBeenCalledWith(file)
  const psd = new File(['psd'], 'layers.psd')
  fireEvent.change(menuContent.getByLabelText('불러오기'), {target: {files: [psd]}})
  expect(onFileOpen).toHaveBeenCalledWith(psd)
  expect(menu).toContainElement(undoButton)
  expect(menu).toContainElement(redoButton)
  expect(undoButton).toBeDisabled()
  expect(redoButton).toBeDisabled()
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
  expect(within(menu).queryByRole('button', {name: '복구 찾기'})).not.toBeInTheDocument()
})

test('should open recovery from the file menu when available', () => {
  const onRecoveryOpen = vi.fn()
  render(() => (
    <EditorToolbar
      playerStatus="ready"
      onRecoveryOpen={onRecoveryOpen}
      onExport={vi.fn()}
      onFileImport={vi.fn()}
      onFileOpen={vi.fn()}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '복구 찾기'}))
  expect(onRecoveryOpen).toHaveBeenCalledOnce()
  onRecoveryOpen.mock.calls[0]![0]()
  expect(screen.getByRole('button', {name: '메인 메뉴'})).toHaveFocus()
})

test('should select the last workspace immediately and launch it after painting', async () => {
  const onStudioOpen = vi.fn()
  const onViewerOpen = vi.fn()
  render(() => (
    <EditorToolbar
      playerStatus="ready"
      onExport={vi.fn()}
      onFileImport={vi.fn()}
      onFileOpen={vi.fn()}
      onStudioOpen={onStudioOpen}
      onViewerOpen={onViewerOpen}
    />
  ))
  const navigation = within(screen.getByRole('navigation', {name: '작업 공간 이동'}))
  fireEvent.click(navigation.getByRole('button', {name: 'Studio'}))
  fireEvent.click(navigation.getByRole('button', {name: 'Viewer'}))
  expect(navigation.getByRole('button', {name: 'Viewer'})).toHaveAttribute('data-selected')
  expect(onStudioOpen).not.toHaveBeenCalled()
  expect(onViewerOpen).not.toHaveBeenCalled()
  await waitFor(() => expect(onViewerOpen).toHaveBeenCalledOnce(), {interval: 1})
  expect(onStudioOpen).not.toHaveBeenCalled()
})

test('should keep workspace launch actions in the header and omit duplicate file menu entries', () => {
  render(() => (
    <EditorToolbar
      playerStatus="ready"
      onExport={vi.fn()}
      onFileImport={vi.fn()}
      onFileOpen={vi.fn()}
      onStudioOpen={vi.fn()}
      onViewerOpen={vi.fn()}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '메인 메뉴'}))
  expect(screen.queryByRole('button', {name: 'Studio로 열기'})).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '뷰어로 열기'})).not.toBeInTheDocument()
  const navigation = within(screen.getByRole('navigation', {name: '작업 공간 이동'}))
  expect(navigation.getByRole('button', {name: 'Studio'})).toBeEnabled()
  expect(navigation.getByRole('button', {name: 'Viewer'})).toBeEnabled()
})

test('should offer Poffo document saving without a separate download retry entry', () => {
  const compressed = vi.fn()
  render(() => (
    <EditorToolbar
      playerStatus="ready"
      onExport={vi.fn()}
      onFileImport={vi.fn()}
      onFileOpen={vi.fn()}
      onPoffoExport={compressed}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '문서 저장'}))
  expect(compressed).toHaveBeenCalledOnce()
  expect(screen.queryByRole('link', {name: /다시 다운로드/u})).not.toBeInTheDocument()
  expect(screen.getByLabelText('불러오기', {selector: 'input'})).toHaveAttribute(
    'accept',
    expect.stringContaining('.poffo'),
  )
})
