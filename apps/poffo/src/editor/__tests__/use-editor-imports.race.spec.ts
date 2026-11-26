/** @vitest-environment jsdom */
import {createRoot, flush} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'
import {createHistory as useDocumentHistory} from '../../../../../packages/puppet/src/editor/__tests__/fixtures/history'
import {useEditorImports} from '../use-editor-imports'
test('should supersede a pending open when reimport starts', async () => {
  await createRoot((dispose) => {
    const original = createDemoDocument()
    const history = useDocumentHistory({initialDocument: original})
    const imports = useEditorImports({
      document: history.document,
      onDocumentChange: history.setDocument,
      onNotice: vi.fn(),
      onReimportDocumentChange: history.setDocument,
      readPsd: () => new Promise(() => {}),
    })
    let resolveText!: (value: string) => void
    const file = new File([], 'old.json')
    Object.defineProperty(file, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          resolveText = resolve
        }),
    })
    return async () => {
      flush()
      const pending = imports.handleOpen(file)
      void imports.reimport.load(new File([], 'new.psd'))
      resolveText(serializeDocument({...original, viewport: {height: 999, width: 999}}))
      await pending
      flush()
      expect(history.document().viewport).toEqual(original.viewport)
      dispose()
    }
  })()
})

test.each(['handleImport', 'handleOpen'] as const)(
  'should cancel %s without committing a late file result',
  async (operation) => {
    await createRoot((dispose) => {
      const original = createDemoDocument()
      const history = useDocumentHistory({initialDocument: original})
      const onNotice = vi.fn()
      const imports = useEditorImports({
        document: history.document,
        onDocumentChange: history.setDocument,
        onNotice,
        onReimportDocumentChange: history.setDocument,
      })
      let finish!: (source: string) => void
      const file = new File([], 'pending.json')
      Object.defineProperty(file, 'text', {
        value: () =>
          new Promise<string>((resolve) => {
            finish = resolve
          }),
      })
      return async () => {
        flush()
        const pending = imports[operation](file)
        flush()
        expect(imports.pendingFile()).toBe('pending.json')
        imports.cancel()
        flush()
        expect(imports.pendingFile()).toBeNull()
        finish(serializeDocument({...original, viewport: {height: 999, width: 999}}))
        await pending
        flush()
        expect(history.document()).toEqual(original)
        flush()
        expect(history.canUndo()).toBe(false)
        flush()
        expect(onNotice).toHaveBeenLastCalledWith(null)
        dispose()
      }
    })()
  },
)

test('should not close the newest loading dialog when a superseded read finishes', async () => {
  await createRoot((dispose) => {
    const original = createDemoDocument()
    const imports = useEditorImports({
      document: () => original,
      onDocumentChange: vi.fn(),
      onNotice: vi.fn(),
      onReimportDocumentChange: vi.fn(),
    })
    let finish!: (value: string) => void
    const file = new File([], 'old.json')
    Object.defineProperty(file, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          finish = resolve
        }),
    })
    return async () => {
      flush()
      const pending = imports.handleOpen(file)
      const newer = new File([], 'new.json')
      Object.defineProperty(newer, 'text', {value: () => new Promise(() => {})})
      void imports.handleOpen(newer)
      finish(serializeDocument(original))
      await pending
      flush()
      expect(imports.pendingFile()).toBe('new.json')
      imports.cancel()
      dispose()
    }
  })()
})
