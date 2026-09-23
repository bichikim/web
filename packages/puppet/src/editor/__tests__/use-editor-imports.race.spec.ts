/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, serializeDocument} from '../../player'
import {useDocumentHistory} from '../use-document-history'
import {useEditorImports} from '../use-editor-imports'
test('should supersede a pending open when reimport starts', async () => {
  await createRoot(async (dispose) => {
    const original = createDemoDocument()
    const history = useDocumentHistory({initialDocument: original})
    const imports = useEditorImports({
      document: history.document,
      onDocumentChange: history.setDocument,
      onNotice: vi.fn(),
      readPsd: () => new Promise(() => {}),
      onReimportDocumentChange: history.setDocument,
    })
    let resolveText!: (value: string) => void
    const file = new File([], 'old.json')
    Object.defineProperty(file, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          resolveText = resolve
        }),
    })
    const pending = imports.handleOpen(file)
    void imports.reimport.load(new File([], 'new.psd'))
    resolveText(serializeDocument({...original, viewport: {height: 999, width: 999}}))
    await pending
    expect(history.document().viewport).toEqual(original.viewport)
    dispose()
  })
})
