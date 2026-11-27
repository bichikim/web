import {createRoot, flush} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../player'
import {useModelHistory} from '../use-model-history'
import {createElementModel} from '../../editor-element/create-element-model'
import {setPartRenderProperties} from '../internal/part-properties'

const renameFirstParameter = (document: PuppetDocument, name: string): PuppetDocument => ({
  ...document,
  parameters: document.parameters?.map((parameter, index) =>
    index === 0 ? {...parameter, name} : parameter,
  ),
})

describe('useDocumentHistory', () => {
  test('should retain redo when a property is submitted with its current value', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      const edited = setPartRenderProperties({
        document: initialDocument,
        partId: 'mesh-preview',
        properties: {opacity: 0.5},
      })!
      return () => {
        flush()
        history.setDocument(edited)
        history.setDocument(renameFirstParameter(edited, 'Next'))
        history.undo()
        history.setDocument(
          setPartRenderProperties({
            document: history.document(),
            partId: 'mesh-preview',
            properties: {opacity: 0.5},
          })!,
        )
        flush()
        expect(history.entries()).toHaveLength(3)
        flush()
        expect(history.undoCount()).toBe(1)
        flush()
        expect(history.redo()).toBe(true)
        flush()
        expect(history.document().parameters?.[0]?.name).toBe('Next')
        dispose()
      }
    })()
  })

  test('should preserve redo when a gesture returns to its starting values', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      const edited = renameFirstParameter(initialDocument, 'First')
      return () => {
        flush()
        history.setDocument(edited)
        history.undo()
        history.beginTransaction()
        history.setDocument(renameFirstParameter(initialDocument, 'Preview'))
        history.setDocument(
          renameFirstParameter(initialDocument, initialDocument.parameters![0]!.name),
        )
        history.endTransaction()
        flush()
        expect(history.undoCount()).toBe(0)
        flush()
        expect(history.document()).toBe(initialDocument)
        flush()
        expect(history.redo()).toBe(true)
        flush()
        expect(history.document()).toBe(edited)
        dispose()
      }
    })()
  })

  test('should preserve redo when a canceled gesture restores its starting document', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      const edited = renameFirstParameter(initialDocument, 'First')
      return () => {
        flush()
        history.setDocument(edited)
        history.undo()
        history.beginTransaction()
        history.setDocument(renameFirstParameter(initialDocument, 'Preview'))
        history.setDocument(initialDocument)
        history.endTransaction()
        flush()
        expect(history.canRedo()).toBe(true)
        flush()
        expect(history.redo()).toBe(true)
        flush()
        expect(history.document()).toBe(edited)
        dispose()
      }
    })()
  })

  test('should describe the part property once for a continuous edit', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      return () => {
        flush()
        history.beginTransaction()
        history.setDocument(
          setPartRenderProperties({
            document: history.document(),
            partId: 'mesh-preview',
            properties: {opacity: 0.5},
          })!,
        )
        history.setDocument(
          setPartRenderProperties({
            document: history.document(),
            partId: 'mesh-preview',
            properties: {opacity: 0.2},
          })!,
        )
        history.endTransaction()
        flush()
        expect(history.entries().map((entry) => entry.title)).toEqual([
          '문서 열기',
          'mesh-preview · 불투명도 변경',
        ])
        flush()
        expect(history.undo()).toBe(true)
        flush()
        expect(history.document()).toBe(initialDocument)
        flush()
        expect(history.redo()).toBe(true)
        flush()
        expect(history.document().parts[0]?.properties?.opacity).toBe(0.2)
        dispose()
      }
    })()
  })
  test('should name edits and navigate directly through undo and redo entries', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      const firstDocument = renameFirstParameter(initialDocument, 'First')
      return () => {
        flush()
        history.setDocument(firstDocument)
        history.setDocument(renameFirstParameter(firstDocument, 'Second'))
        const entries = history.entries()
        flush()
        expect(entries.map((entry) => entry.title)).toEqual([
          '문서 열기',
          '파라미터 이름 변경',
          '파라미터 이름 변경',
        ])
        flush()
        expect(history.goTo(entries[0]!.id)).toBe(true)
        flush()
        expect(history.document()).toBe(initialDocument)
        flush()
        expect(history.entries().map((entry) => entry.state)).toEqual([
          'current',
          'future',
          'future',
        ])
        flush()
        expect(history.redoCount()).toBe(2)
        flush()
        expect(history.goTo(entries[1]!.id)).toBe(true)
        flush()
        expect(history.document()).toBe(firstDocument)
        flush()
        expect(history.entries().map((entry) => entry.state)).toEqual(['past', 'current', 'future'])
        flush()
        expect(history.goTo(entries[1]!.id)).toBe(false)
        flush()
        expect(history.goTo(-1)).toBe(false)
        dispose()
      }
    })()
  })

  test('should keep an explicit transaction title and discard future entries on a new edit', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      return () => {
        flush()
        history.beginTransaction('모델 복구')
        history.setDocument(renameFirstParameter(initialDocument, 'First'))
        history.setDocument(renameFirstParameter(initialDocument, 'Second'))
        flush()
        expect(history.entries()).toHaveLength(1)
        history.endTransaction()
        const discarded = history.entries()[1]!.id
        flush()
        expect(history.entries()[1]!.title).toBe('모델 복구')
        history.undo()
        history.setDocument(renameFirstParameter(initialDocument, 'Replacement'), 'JSON 불러오기')
        flush()
        expect(history.entries().map((entry) => entry.title)).toEqual([
          '문서 열기',
          'JSON 불러오기',
        ])
        flush()
        expect(history.goTo(discarded)).toBe(false)
        dispose()
      }
    })()
  })
  test('should undo and redo document snapshots', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      const firstDocument = renameFirstParameter(initialDocument, 'First')
      const secondDocument = renameFirstParameter(firstDocument, 'Second')

      return () => {
        flush()
        history.setDocument(firstDocument)
        history.setDocument(secondDocument)

        flush()
        expect(history.canUndo()).toBe(true)
        flush()
        expect(history.canRedo()).toBe(false)
        flush()
        expect(history.undoCount()).toBe(2)
        flush()
        expect(history.undo()).toBe(true)
        flush()
        expect(history.document()).toBe(firstDocument)
        flush()
        expect(history.redoCount()).toBe(1)
        flush()
        expect(history.redo()).toBe(true)
        flush()
        expect(history.document()).toBe(secondDocument)

        dispose()
      }
    })()
  })

  test('should discard redo snapshots after a new edit', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      const firstDocument = renameFirstParameter(initialDocument, 'First')

      return () => {
        flush()
        history.setDocument(firstDocument)
        history.undo()
        history.setDocument(renameFirstParameter(initialDocument, 'Replacement'))

        flush()
        expect(history.canRedo()).toBe(false)
        flush()
        expect(history.redo()).toBe(false)

        dispose()
      }
    })()
  })

  test('should keep a transaction as one undo step', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      const firstDocument = renameFirstParameter(initialDocument, 'First')
      const secondDocument = renameFirstParameter(firstDocument, 'Second')

      return () => {
        flush()
        history.beginTransaction()
        history.setDocument(firstDocument)
        history.setDocument(secondDocument)
        flush()
        expect(history.document()).toBe(secondDocument)
        history.endTransaction()
        flush()
        expect(history.document()).toBe(secondDocument)

        flush()
        expect(history.undoCount()).toBe(1)
        flush()
        expect(history.undo()).toBe(true)
        flush()
        expect(history.document()).toBe(initialDocument)
        flush()
        expect(history.document()).toBe(initialDocument)

        dispose()
      }
    })()
  })

  test('should omit unchanged transactions and duplicate documents', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )

      return () => {
        flush()
        history.setDocument(initialDocument)
        history.beginTransaction()
        history.endTransaction()

        flush()
        expect(history.canUndo()).toBe(false)

        dispose()
      }
    })()
  })

  test('should limit retained undo snapshots and reset the history', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, limit: 2, sessionId: 'test'}),
        'editor',
      )
      const firstDocument = renameFirstParameter(initialDocument, 'First')
      const secondDocument = renameFirstParameter(firstDocument, 'Second')
      const thirdDocument = renameFirstParameter(secondDocument, 'Third')

      return () => {
        flush()
        history.setDocument(firstDocument)
        history.setDocument(secondDocument)
        history.setDocument(thirdDocument)
        const retained = history.entries()
        flush()
        expect(retained).toHaveLength(3)
        flush()
        expect(history.undoCount()).toBe(2)
        flush()
        expect(history.undo()).toBe(true)
        flush()
        expect(history.undo()).toBe(true)
        flush()
        expect(history.document()).toBe(firstDocument)
        flush()
        expect(history.undo()).toBe(false)

        history.resetDocument(initialDocument)
        flush()
        expect(history.entries().map((entry) => entry.state)).toEqual(['current'])
        flush()
        expect(history.goTo(retained[0]!.id)).toBe(false)
        flush()
        expect(history.document()).toBe(initialDocument)
        flush()
        expect(history.canUndo()).toBe(false)
        flush()
        expect(history.canRedo()).toBe(false)

        dispose()
      }
    })()
  })
  test('should reject history navigation until a pending gesture is completed', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useModelHistory(
        createElementModel({document: initialDocument, sessionId: 'test'}),
        'editor',
      )
      const initialId = history.entries()[0]!.id
      const edited = renameFirstParameter(initialDocument, 'Dragged')
      return () => {
        flush()
        history.beginTransaction()
        history.setDocument(edited)
        flush()
        expect(history.goTo(initialId)).toBe(false)
        history.endTransaction()
        flush()
        expect(history.goTo(initialId)).toBe(true)
        flush()
        expect(history.document()).toBe(initialDocument)
        flush()
        expect(history.redoCount()).toBe(1)
        flush()
        expect(history.redo()).toBe(true)
        flush()
        expect(history.document()).toBe(edited)
        dispose()
      }
    })()
  })
})
