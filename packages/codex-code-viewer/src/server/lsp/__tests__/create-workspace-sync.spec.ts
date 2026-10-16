import type {MessageConnection} from 'vscode-jsonrpc/node.js'
import {describe, expect, it, vi} from 'vitest'
import {createDocumentSync} from '../create-document-sync'
import {createWorkspaceSync} from '../create-workspace-sync'
vi.mock('../create-document-sync', () => ({createDocumentSync: vi.fn()}))
describe('createWorkspaceSync', () => {
  it('should retain a draft for related queries and close it on primary navigation', async () => {
    const documents = {
      close: vi.fn(),
      dispose: vi.fn(),
      synchronize: vi.fn(),
      waitForAnalysis: vi.fn(),
    }
    vi.mocked(createDocumentSync).mockReturnValue(documents)
    const connection = {sendNotification: vi.fn()} as unknown as MessageConnection
    const sync = createWorkspaceSync({connection, language: 'python'})
    await sync.synchronize('/workspace/core.py', '# unsaved\ndef greet(): pass', true, {
      draft: true,
    })
    await sync.synchronize('/workspace/core.pyi', 'def greet() -> None: ...', true, {
      retainDrafts: true,
    })
    expect(documents.close).not.toHaveBeenCalled()
    expect(documents.synchronize).toHaveBeenLastCalledWith(
      '/workspace/core.pyi',
      'def greet() -> None: ...',
      true,
    )
    await sync.synchronize('/workspace/use.py', 'greet()', true)
    expect(documents.close).toHaveBeenCalledExactlyOnceWith('/workspace/core.py')
    expect(connection.sendNotification).toHaveBeenCalledExactlyOnceWith(
      'workspace/didChangeWatchedFiles',
      {changes: [{type: 2, uri: 'file:///workspace/core.py'}]},
    )
    sync.dispose()
  })
})
