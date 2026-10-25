/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createPort} from './fixtures/viewer'
import {useViewer} from '../use-viewer'
import {useWorkspaceDocuments} from '../use-workspace-documents'

let dispose = () => {}
afterEach(() => dispose())
it('should search deleted source and save its new body without saving the retained live draft', async () => {
  const port = {
    ...createPort(),
    readBaseline: vi
      .fn()
      .mockResolvedValue({available: true, base: 'HEAD', source: 'previous deleted source'}),
  }
  const fixture = createRoot((cleanup) => {
    dispose = cleanup
    const viewer = useViewer(port)
    const documents = useWorkspaceDocuments({element: () => null, onSearch: vi.fn(), port, viewer})
    return {documents, viewer}
  })
  await waitFor(() => expect(fixture.viewer.session()).not.toBeNull(), {interval: 1})
  fixture.viewer.editing.toggle()
  fixture.viewer.editing.change('unsaved live draft')
  expect(fixture.viewer.editing.dirty()).toBe(true)
  fixture.documents.openDeleted('removed.ts')
  await waitFor(
    () => expect(fixture.documents.deletedView()?.document.source).toBe('previous deleted source'),
    {interval: 1},
  )
  fixture.documents.findText('previous')
  expect(fixture.documents.matches()).toHaveLength(1)
  expect(fixture.documents.deletedView()?.draftSource).toBe('')
  expect(fixture.documents.deletedView()?.editing).toBe(false)
  fixture.documents.deletedView()?.onChange?.('ignored in view mode')
  globalThis.dispatchEvent(
    new KeyboardEvent('keydown', {cancelable: true, ctrlKey: true, key: 's'}),
  )
  expect(fixture.documents.deletedView()?.draftSource).toBe('')
  expect(port.call).not.toHaveBeenCalledWith('code.write', expect.anything())
  fixture.documents.deletedView()?.onToggleEditing?.()
  fixture.documents.deletedView()?.onChange?.('recreated deleted file')
  expect(fixture.documents.deletedView()?.draftSource).toBe('recreated deleted file')
  expect(port.call).not.toHaveBeenCalledWith('code.write', expect.anything())
  globalThis.dispatchEvent(
    new KeyboardEvent('keydown', {cancelable: true, ctrlKey: true, key: 's'}),
  )
  await waitFor(
    () =>
      expect(port.call).toHaveBeenCalledWith('code.write', {
        path: 'removed.ts',
        revision: null,
        session: 'session',
        source: 'recreated deleted file',
      }),
    {interval: 1},
  )
  await waitFor(() => expect(fixture.documents.deletedView()).toBeNull(), {interval: 1})
  await fixture.documents.moveFile(-1)
  expect(fixture.viewer.editing.source()).toBe('unsaved live draft')
  expect(fixture.viewer.editing.dirty()).toBe(true)
})
it('should restore focus to the deleted document when its search bar closes', () => {
  const element = document.createElement('div')
  const marker = document.createElement('button')
  marker.setAttribute('data-document-focus', '')
  element.append(marker)
  document.body.append(element)
  try {
    createRoot((cleanup) => {
      dispose = cleanup
      const port = createPort()
      const viewer = useViewer(port)
      const documents = useWorkspaceDocuments({
        element: () => element,
        onSearch: vi.fn(),
        port,
        viewer,
      })
      documents.findText('target')
      documents.closeSearch()
      expect(documents.visible()).toBe(false)
      expect(marker).toHaveFocus()
    })
  } finally {
    element.remove()
  }
})
