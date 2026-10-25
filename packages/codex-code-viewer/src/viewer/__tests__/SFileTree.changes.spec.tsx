/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ViewerSession} from '../../shared/contracts'
import type {ChangedFile} from '../../shared/change-contracts'
import type {ViewerPort} from '../types'
import {SFileTree} from '../SFileTree'

const session: ViewerSession = {
  document: {
    lines: [[]],
    location: {column: 1, line: 1, path: 'src/main.ts'},
    revision: 'one',
    source: '',
  },
  session: 'one',
  workspace: '/project',
}
const changes: readonly ChangedFile[] = [
  {kind: 'modified', openable: true, path: 'src/main.ts'},
  {kind: 'added', openable: true, path: 'new/fresh.ts'},
  {kind: 'deleted', openable: true, path: 'old/gone.ts'},
]
const createPort = (): ViewerPort => ({
  call: vi.fn().mockResolvedValue({
    content: [],
    structuredContent: {
      files: [
        {openable: true, path: 'src/main.ts'},
        {openable: true, path: 'clean.ts'},
      ],
      truncated: false,
    },
  }),
  context: vi.fn(),
  start: vi.fn(),
})
afterEach(cleanup)

describe('SFileTree changes', () => {
  it('should filter changed paths with their parents and restore ordinary expansion when disabled', async () => {
    render(() => (
      <SFileTree port={createPort()} session={session} visible changes={changes} changesAvailable />
    ))
    await screen.findByRole('treeitem', {name: 'clean.ts'})
    fireEvent.click(screen.getByRole('treeitem', {name: 'src'}))
    fireEvent.click(screen.getByRole('button', {name: '모든 변경 사항'}))
    expect(screen.queryByRole('treeitem', {name: 'clean.ts'})).toBeNull()
    expect(screen.getByRole('treeitem', {name: 'main.ts'})).toHaveAttribute(
      'aria-description',
      '수정된 파일',
    )
    expect(screen.getByRole('treeitem', {name: 'fresh.ts'})).toHaveAttribute(
      'aria-description',
      '추가된 파일',
    )
    expect(screen.getByRole('treeitem', {name: 'gone.ts'})).toHaveAttribute(
      'aria-description',
      '삭제된 파일 · 변경 사항 보기',
    )
    fireEvent.click(screen.getByRole('button', {name: '모든 변경 사항'}))
    expect(screen.getByRole('treeitem', {name: 'clean.ts'})).toBeTruthy()
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
  })
  it('should open a deleted file comparison without asking the host to open its missing path', () => {
    const [documentPath, setDocumentPath] = createSignal<string>()
    const onDeleted = vi.fn((path: string) => setDocumentPath(path))
    const onOpen = vi.fn()
    const openFile = vi.fn()
    render(() => (
      <SFileTree
        documentPath={documentPath()}
        port={{...createPort(), openFile}}
        session={session}
        visible
        changes={changes}
        changesAvailable
        onDeleted={onDeleted}
        onOpen={onOpen}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '모든 변경 사항'}))
    fireEvent.click(screen.getByRole('treeitem', {name: 'gone.ts'}), {metaKey: true})
    expect(onDeleted).toHaveBeenCalledWith('old/gone.ts')
    expect(onOpen).not.toHaveBeenCalled()
    expect(openFile).not.toHaveBeenCalled()
    expect(screen.getByRole('treeitem', {name: 'gone.ts'})).toHaveAttribute('aria-selected', 'true')
    setDocumentPath(undefined)
    expect(screen.getByRole('treeitem', {name: 'gone.ts'})).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })
  it('should disable the change filter outside a Git workspace', () => {
    render(() => (
      <SFileTree port={createPort()} session={session} visible changesAvailable={false} />
    ))
    expect(screen.getByRole('button', {name: '모든 변경 사항'})).toBeDisabled()
  })
})
