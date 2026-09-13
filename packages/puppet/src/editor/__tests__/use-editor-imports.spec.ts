/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, serializeDocument} from '../../player'
import {useDocumentHistory} from '../use-document-history'
import {useEditorImports} from '../use-editor-imports'

test('should append JSON or replace it according to the action, with undo for both', async () => {
  await createRoot(async (dispose) => {
    const original = createDemoDocument()
    const history = useDocumentHistory({initialDocument: original})
    const imports = useEditorImports({
      document: history.document,
      onDocumentChange: history.setDocument,
      onNotice: vi.fn(),
      onReimportDocumentChange: history.setDocument,
    })
    const file = new File([], 'model.json')
    Object.defineProperty(file, 'text', {value: async () => serializeDocument(original)})
    await imports.handleImport(file)
    expect(history.document().parts).toHaveLength(6)
    await imports.handleOpen(file)
    expect(history.document().parts).toHaveLength(3)
    expect(history.undo()).toBe(true)
    expect(history.document().parts).toHaveLength(6)
    expect(history.undo()).toBe(true)
    expect(history.document()).toEqual(original)
    dispose()
  })
})
