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

test('should replace a JSON document with a UTF-8 byte order mark', async () => {
  await createRoot(async (dispose) => {
    const original = createDemoDocument()
    const incoming = {...original, viewport: {height: 999, width: 999}}
    const history = useDocumentHistory({initialDocument: original})
    const onNotice = vi.fn()
    const imports = useEditorImports({
      document: history.document,
      onDocumentChange: history.setDocument,
      onNotice,
      onReimportDocumentChange: history.setDocument,
    })
    const file = new File([`\uFEFF${serializeDocument(incoming)}`], 'model.json', {
      type: 'application/json',
    })
    Object.defineProperty(file, 'text', {
      value: async () => `\uFEFF${serializeDocument(incoming)}`,
    })

    await imports.handleOpen(file)

    expect(onNotice).toHaveBeenLastCalledWith(
      expect.stringContaining('model.json: 문서를 교체했습니다.'),
    )
    expect(history.document().viewport).toEqual(incoming.viewport)
    dispose()
  })
})

test('should replace a JSON document identified by its MIME type', async () => {
  await createRoot(async (dispose) => {
    const original = createDemoDocument()
    const incoming = {...original, viewport: {height: 999, width: 999}}
    const history = useDocumentHistory({initialDocument: original})
    const onNotice = vi.fn()
    const imports = useEditorImports({
      document: history.document,
      onDocumentChange: history.setDocument,
      onNotice,
      onReimportDocumentChange: history.setDocument,
    })
    const file = new File([serializeDocument(incoming)], 'puppet-export', {
      type: 'application/json',
    })
    Object.defineProperty(file, 'text', {
      value: async () => serializeDocument(incoming),
    })

    await imports.handleOpen(file)

    expect(onNotice).toHaveBeenLastCalledWith(
      expect.stringContaining('puppet-export: 문서를 교체했습니다.'),
    )
    expect(history.document().viewport).toEqual(incoming.viewport)
    dispose()
  })
})

test('should load an example on selection and keep the previous document in undo history', async () => {
  await createRoot(async (dispose) => {
    const original = createDemoDocument()
    const incoming = {...original, viewport: {height: 640, width: 640}}
    const history = useDocumentHistory({initialDocument: original})
    const imports = useEditorImports({
      document: history.document,
      onDocumentChange: history.setDocument,
      onNotice: vi.fn(),
      onReimportDocumentChange: history.setDocument,
    })
    const load = vi.fn(async () => {
      const file = new File([], 'example.json')
      Object.defineProperty(file, 'text', {value: async () => serializeDocument(incoming)})
      return file
    })

    expect(load).not.toHaveBeenCalled()
    await imports.handleOpenExample({label: '예제', load})

    expect(load).toHaveBeenCalledOnce()
    expect(history.document().viewport).toEqual(incoming.viewport)
    expect(history.undo()).toBe(true)
    expect(history.document()).toEqual(original)
    dispose()
  })
})
