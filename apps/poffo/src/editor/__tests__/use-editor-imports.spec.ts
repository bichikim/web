/** @vitest-environment jsdom */
import {createRoot, flush} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'
import {useModelHistory} from '@winter-love/puppet/editor'
import {createModelSession} from '../../model/create-model-session'
import {useEditorImports} from '../use-editor-imports'

test('should append JSON or replace it according to the action, with undo for both', async () => {
  await createRoot((dispose) => {
    const original = createDemoDocument()
    const history = useModelHistory(
      createModelSession({document: original, sessionId: 'test'}),
      'test',
    )
    const imports = useEditorImports({
      document: history.document,
      onDocumentChange: history.setDocument,
      onNotice: vi.fn(),
      onReimportDocumentChange: history.setDocument,
    })
    const file = new File([], 'model.json')
    Object.defineProperty(file, 'text', {value: async () => serializeDocument(original)})
    return async () => {
      flush()
      await imports.handleImport(file)
      flush()
      expect(history.document().parts).toHaveLength(6)
      await imports.handleOpen(file)
      flush()
      expect(history.document().parts).toHaveLength(3)
      flush()
      expect(history.undo()).toBe(true)
      flush()
      expect(history.document().parts).toHaveLength(6)
      flush()
      expect(history.undo()).toBe(true)
      flush()
      expect(history.document()).toEqual(original)
      dispose()
    }
  })()
})

test('should replace a JSON document with a UTF-8 byte order mark', async () => {
  await createRoot((dispose) => {
    const original = createDemoDocument()
    const incoming = {...original, viewport: {height: 999, width: 999}}
    const history = useModelHistory(
      createModelSession({document: original, sessionId: 'test'}),
      'test',
    )
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

    return async () => {
      flush()
      await imports.handleOpen(file)

      flush()
      expect(onNotice).toHaveBeenLastCalledWith(null)
      flush()
      expect(history.document().viewport).toEqual(incoming.viewport)
      dispose()
    }
  })()
})

test('should replace a JSON document identified by its MIME type', async () => {
  await createRoot((dispose) => {
    const original = createDemoDocument()
    const incoming = {...original, viewport: {height: 999, width: 999}}
    const history = useModelHistory(
      createModelSession({document: original, sessionId: 'test'}),
      'test',
    )
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

    return async () => {
      flush()
      await imports.handleOpen(file)

      flush()
      expect(onNotice).toHaveBeenLastCalledWith(null)
      flush()
      expect(history.document().viewport).toEqual(incoming.viewport)
      dispose()
    }
  })()
})

test('should load an example on selection and keep the previous document in undo history', async () => {
  await createRoot((dispose) => {
    const original = createDemoDocument()
    const incoming = {...original, viewport: {height: 640, width: 640}}
    const history = useModelHistory(
      createModelSession({document: original, sessionId: 'test'}),
      'test',
    )
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

    return async () => {
      flush()
      expect(load).not.toHaveBeenCalled()
      await imports.handleOpenExample({label: '예제', load})

      flush()
      expect(load).toHaveBeenCalledOnce()
      flush()
      expect(history.document().viewport).toEqual(incoming.viewport)
      flush()
      expect(history.undo()).toBe(true)
      flush()
      expect(history.document()).toEqual(original)
      dispose()
    }
  })()
})
