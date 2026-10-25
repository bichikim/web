/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {EditorView} from '@codemirror/view'
import {afterEach, expect, it, vi} from 'vitest'
import {SDeletedDocument} from '../SDeletedDocument'
import {ViewStateContext} from '../view-state/context'
import {findText} from '../find-text'

afterEach(cleanup)
it('should edit a blank current body while keeping expanded historical contents read-only', () => {
  const [source, setSource] = createSignal('')
  const [editing, setEditing] = createSignal(false)
  const save = vi.fn()
  render(() => (
    <SDeletedDocument
      document={{base: 'HEAD', path: 'removed.ts', source: 'previous historical content'}}
      draftSource={source()}
      editing={editing()}
      onToggleEditing={() => setEditing((previous) => !previous)}
      onChange={setSource}
      onSave={save}
    />
  ))
  expect(screen.queryByRole('region', {name: '새 파일 내용'})).toBeNull()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.queryByRole('button', {name: '저장'})).toBeNull()
  const toggle = screen.getByRole('button', {name: '편집'})
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(toggle)
  const current = within(screen.getByRole('region', {name: '새 파일 내용'})).getByRole('textbox')
  expect(current).toHaveAttribute('contenteditable', 'true')
  expect(current).toHaveTextContent(/^$/u)
  expect(screen.queryByText('읽기 전용')).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '삭제된 내용 펼치기'}))
  const historical = within(screen.getByRole('region', {name: '삭제된 원문'})).getByRole('table', {
    name: '변경 내용 비교',
  })
  expect(historical.querySelector('[contenteditable]')).toBeNull()
  const view = EditorView.findFromDOM(current)!
  view.dispatch({changes: {from: 0, insert: 'new file contents'}})
  expect(source()).toBe('new file contents')
  expect(historical).toHaveTextContent('previous historical content')
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: '저장'}))
  expect(save).toHaveBeenCalledOnce()
  fireEvent.click(toggle)
  expect(current).toHaveAttribute('contenteditable', 'false')
  expect(current).toHaveTextContent('new file contents')
  expect(screen.queryByRole('button', {name: '저장'})).toBeNull()
  fireEvent.click(toggle)
  view.dispatch({changes: {from: 0, insert: '', to: view.state.doc.length}})
  fireEvent.click(toggle)
  expect(screen.queryByRole('region', {name: '새 파일 내용'})).toBeNull()
})
it('should locate a draft search result without expanding an unrelated deleted original', async () => {
  const [request, setRequest] = createSignal(0)
  const original = 'previous historical content'
  render(() => (
    <SDeletedDocument
      document={{base: 'HEAD', path: 'removed.ts', source: original}}
      draftSource="new draft target"
      onChange={vi.fn()}
      matches={findText(`${original}\nnew draft target`, 'target')}
      activeMatch={0}
      searchScrollRequest={request()}
    />
  ))
  setRequest(1)
  expect(screen.getByRole('button', {name: '삭제된 내용 펼치기'})).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await waitFor(() => expect(screen.getByText('target')).toBeVisible())
})
it('should keep deleted source collapsed and toggle its read-only body from the deletion marker', () => {
  const bind = vi.fn()
  render(() => (
    <ViewStateContext.Provider value={{bind}}>
      <SDeletedDocument
        document={{base: 'HEAD', path: 'src/removed.ts', source: 'export const removed = true'}}
      />
    </ViewStateContext.Provider>
  ))
  expect(screen.getByText('삭제된 파일')).toBeVisible()
  expect(screen.getByText('읽기 전용')).toBeVisible()
  expect(screen.getByText('src/removed.ts')).toBeVisible()
  const toggle = screen.getByRole('button', {name: '삭제된 내용 펼치기'})
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('textbox')).toBeNull()
  fireEvent.click(toggle)
  const editor = screen.getByRole('table', {name: '변경 내용 비교'})
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(editor).toHaveTextContent('export const removed = true')
  expect(within(editor).getByRole('cell', {name: '이전 줄 번호'})).toHaveTextContent('1')
  expect(within(editor).getByRole('cell', {name: '현재 줄 번호'})).toBeEmptyDOMElement()
  expect(within(editor).getByText('−')).toBeVisible()
  expect(editor.querySelector('[contenteditable]')).toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('button', {name: '저장'})).toBeNull()
  expect(screen.queryByRole('button', {name: '편집'})).toBeNull()
  expect(bind).not.toHaveBeenCalled()
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(toggle).toHaveAccessibleName('삭제된 내용 펼치기')
})
it.each([
  {base: 'HEAD', path: 'src/other.ts', source: 'export const other = true'},
  {base: 'HEAD', path: 'src/removed.ts', source: 'export const refreshed = true'},
])('should collapse stale deleted contents when the document becomes $path / $source', (next) => {
  const [document, setDocument] = createSignal({
    base: 'HEAD',
    path: 'src/removed.ts',
    source: 'export const removed = true',
  })
  render(() => <SDeletedDocument document={document()} />)
  fireEvent.click(screen.getByRole('button', {name: '삭제된 내용 펼치기'}))
  expect(screen.getByRole('table', {name: '변경 내용 비교'})).toBeVisible()
  setDocument(next)
  expect(screen.queryByRole('textbox')).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '삭제된 내용 펼치기'}))
  expect(screen.getByRole('table', {name: '변경 내용 비교'})).toHaveTextContent(next.source)
})
it('should expand hidden deleted contents when a search result is requested', async () => {
  const [request, setRequest] = createSignal(0)
  render(() => (
    <SDeletedDocument
      document={{base: 'HEAD', path: 'src/removed.ts', source: 'export const removed = true'}}
      matches={[{end: 20, start: 13}]}
      activeMatch={0}
      searchScrollRequest={request()}
    />
  ))
  expect(screen.queryByRole('textbox')).toBeNull()
  setRequest(1)
  expect(screen.getByRole('button', {name: '삭제된 내용 접기'})).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect(screen.getByRole('table', {name: '변경 내용 비교'})).toBeVisible()
  await waitFor(() => expect(screen.getByText('removed')).toBeVisible())
})
it('should provide the deletion toggle for an empty historical file', () => {
  render(() => <SDeletedDocument document={{base: 'HEAD', path: 'empty.ts', source: ''}} />)
  expect(screen.queryByRole('textbox')).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '삭제된 내용 펼치기'}))
  expect(screen.getByRole('table', {name: '변경 내용 비교'})).toBeVisible()
  expect(screen.queryByRole('row')).toBeNull()
  expect(screen.queryByRole('textbox')).toBeNull()
})
it('should reveal a search result beyond 500 historical lines without truncating deleted contents', async () => {
  const source = `${Array.from({length: 600}, () => '// historical line').join('\n')}\n// final marker`
  const [request, setRequest] = createSignal(0)
  render(() => (
    <SDeletedDocument
      document={{base: 'HEAD', path: 'src/removed.ts', source}}
      matches={findText(source, 'final marker')}
      activeMatch={0}
      searchScrollRequest={request()}
    />
  ))
  expect(screen.queryByRole('textbox')).toBeNull()
  setRequest(1)
  await waitFor(() => expect(screen.getByText('final marker')).toBeVisible())
})
it('should keep the deletion label for binary or oversized baseline files', () => {
  render(() => <SDeletedDocument document={{base: 'HEAD', path: 'image.png', source: null}} />)
  expect(screen.getByText('삭제된 파일')).toBeVisible()
  expect(screen.getByText('텍스트 변경 내용을 표시할 수 없습니다.')).toBeVisible()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.queryByRole('button', {name: '삭제된 내용 펼치기'})).toBeNull()
})

it('should collapse the shared diff panel with its close button and return focus to the deletion marker', () => {
  render(() => (
    <SDeletedDocument document={{base: 'HEAD', path: 'removed.ts', source: 'removed'}} />
  ))
  fireEvent.click(screen.getByRole('button', {name: '삭제된 내용 펼치기'}))
  fireEvent.click(screen.getByRole('button', {name: '변경 사항 닫기'}))
  expect(screen.queryByRole('table', {name: '변경 내용 비교'})).toBeNull()
  expect(screen.getByRole('button', {name: '삭제된 내용 펼치기'})).toHaveFocus()
})
it('should highlight a historical search result after CRLF line endings in the shared diff table', () => {
  const source = 'first\r\n// target'
  render(() => (
    <SDeletedDocument
      document={{base: 'HEAD', path: 'removed.ts', source}}
      matches={findText(source, 'target')}
      activeMatch={0}
      searchScrollRequest={1}
    />
  ))
  const table = screen.getByRole('table', {name: '변경 내용 비교'})
  expect(within(table).getByText('target').tagName).toBe('MARK')
  expect(within(table).getAllByRole('row')).toHaveLength(2)
})

it('should preserve historical text beyond the ordinary diff line-length limit', () => {
  const source = `// ${'x'.repeat(4100)} final marker`
  render(() => <SDeletedDocument document={{base: 'HEAD', path: 'removed.ts', source}} />)
  fireEvent.click(screen.getByRole('button', {name: '삭제된 내용 펼치기'}))
  expect(screen.getByRole('table', {name: '변경 내용 비교'})).toHaveTextContent(source)
})
it('should retain the search input focus when a result expands the deleted original', async () => {
  const [request, setRequest] = createSignal(0)
  render(() => (
    <>
      <input aria-label="search input" />
      <SDeletedDocument
        document={{base: 'HEAD', path: 'removed.ts', source: 'export const target = true'}}
        matches={findText('export const target = true', 'target')}
        activeMatch={0}
        searchScrollRequest={request()}
      />
    </>
  ))
  const input = screen.getByRole('textbox', {name: 'search input'})
  input.focus()
  setRequest(1)
  await Promise.resolve()
  expect(screen.getByText('target')).toBeVisible()
  expect(input).toHaveFocus()
})
it('should retain expanded historical contents when a refresh returns the same path and source', () => {
  const [document, setDocument] = createSignal({
    base: 'HEAD',
    path: 'removed.ts',
    source: 'previous',
  })
  render(() => <SDeletedDocument document={document()} />)
  fireEvent.click(screen.getByRole('button', {name: '삭제된 내용 펼치기'}))
  setDocument({...document()})
  expect(screen.getByRole('button', {name: '삭제된 내용 접기'})).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect(screen.getByRole('table', {name: '변경 내용 비교'})).toBeVisible()
})
