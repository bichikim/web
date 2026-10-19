import {createRoot} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../player'
import {useDocumentHistory} from '../use-document-history'
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
      const history = useDocumentHistory({initialDocument})
      const edited = setPartRenderProperties({
        document: initialDocument,
        partId: 'mesh-preview',
        properties: {opacity: 0.5},
      })!
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
      expect(history.entries()).toHaveLength(3)
      expect(history.undoCount()).toBe(1)
      expect(history.redo()).toBe(true)
      expect(history.document().parameters?.[0]?.name).toBe('Next')
      dispose()
    })
  })

  test('should preserve redo when a gesture returns to its starting values', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})
      const edited = renameFirstParameter(initialDocument, 'First')
      history.setDocument(edited)
      history.undo()
      history.beginTransaction()
      history.setDocument(renameFirstParameter(initialDocument, 'Preview'))
      history.setDocument(
        renameFirstParameter(initialDocument, initialDocument.parameters![0]!.name),
      )
      history.endTransaction()
      expect(history.undoCount()).toBe(0)
      expect(history.document()).toBe(initialDocument)
      expect(history.redo()).toBe(true)
      expect(history.document()).toBe(edited)
      dispose()
    })
  })

  test('should preserve redo when a canceled gesture restores its starting document', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})
      const edited = renameFirstParameter(initialDocument, 'First')
      history.setDocument(edited)
      history.undo()
      history.beginTransaction()
      history.setDocument(renameFirstParameter(initialDocument, 'Preview'))
      history.setDocument(initialDocument)
      history.endTransaction()
      expect(history.canRedo()).toBe(true)
      expect(history.redo()).toBe(true)
      expect(history.document()).toBe(edited)
      dispose()
    })
  })

  test('should describe the part property once for a continuous edit', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})
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
      expect(history.entries().map((entry) => entry.title)).toEqual([
        '문서 열기',
        'mesh-preview · 불투명도 변경',
      ])
      expect(history.undo()).toBe(true)
      expect(history.document()).toBe(initialDocument)
      expect(history.redo()).toBe(true)
      expect(history.document().parts[0]?.properties?.opacity).toBe(0.2)
      dispose()
    })
  })
  test('should name edits and navigate directly through undo and redo entries', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})
      const firstDocument = renameFirstParameter(initialDocument, 'First')
      history.setDocument(firstDocument)
      history.setDocument(renameFirstParameter(firstDocument, 'Second'))
      const entries = history.entries()
      expect(entries.map((entry) => entry.title)).toEqual([
        '문서 열기',
        '파라미터 이름 변경',
        '파라미터 이름 변경',
      ])
      expect(history.goTo(entries[0]!.id)).toBe(true)
      expect(history.document()).toBe(initialDocument)
      expect(history.entries().map((entry) => entry.state)).toEqual(['current', 'future', 'future'])
      expect(history.redoCount()).toBe(2)
      expect(history.goTo(entries[1]!.id)).toBe(true)
      expect(history.committedDocument()).toBe(firstDocument)
      expect(history.entries().map((entry) => entry.state)).toEqual(['past', 'current', 'future'])
      expect(history.goTo(entries[1]!.id)).toBe(false)
      expect(history.goTo(-1)).toBe(false)
      dispose()
    })
  })

  test('should keep an explicit transaction title and discard future entries on a new edit', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})
      history.beginTransaction('모델 복구')
      history.setDocument(renameFirstParameter(initialDocument, 'First'))
      history.setDocument(renameFirstParameter(initialDocument, 'Second'))
      expect(history.entries()).toHaveLength(1)
      history.endTransaction()
      const discarded = history.entries()[1]!.id
      expect(history.entries()[1]!.title).toBe('모델 복구')
      history.undo()
      history.setDocument(renameFirstParameter(initialDocument, 'Replacement'), 'JSON 불러오기')
      expect(history.entries().map((entry) => entry.title)).toEqual(['문서 열기', 'JSON 불러오기'])
      expect(history.goTo(discarded)).toBe(false)
      dispose()
    })
  })
  test('should undo and redo document snapshots', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})
      const firstDocument = renameFirstParameter(initialDocument, 'First')
      const secondDocument = renameFirstParameter(firstDocument, 'Second')

      history.setDocument(firstDocument)
      history.setDocument(secondDocument)

      expect(history.canUndo()).toBe(true)
      expect(history.canRedo()).toBe(false)
      expect(history.undoCount()).toBe(2)
      expect(history.undo()).toBe(true)
      expect(history.document()).toBe(firstDocument)
      expect(history.redoCount()).toBe(1)
      expect(history.redo()).toBe(true)
      expect(history.document()).toBe(secondDocument)

      dispose()
    })
  })

  test('should discard redo snapshots after a new edit', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})
      const firstDocument = renameFirstParameter(initialDocument, 'First')

      history.setDocument(firstDocument)
      history.undo()
      history.setDocument(renameFirstParameter(initialDocument, 'Replacement'))

      expect(history.canRedo()).toBe(false)
      expect(history.redo()).toBe(false)

      dispose()
    })
  })

  test('should keep a transaction as one undo step', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})
      const firstDocument = renameFirstParameter(initialDocument, 'First')
      const secondDocument = renameFirstParameter(firstDocument, 'Second')

      history.beginTransaction()
      history.setDocument(firstDocument)
      history.setDocument(secondDocument)
      expect(history.committedDocument()).toBe(initialDocument)
      history.endTransaction()
      expect(history.committedDocument()).toBe(secondDocument)

      expect(history.undoCount()).toBe(1)
      expect(history.undo()).toBe(true)
      expect(history.document()).toBe(initialDocument)
      expect(history.committedDocument()).toBe(initialDocument)

      dispose()
    })
  })

  test('should omit unchanged transactions and duplicate documents', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})

      history.setDocument(initialDocument)
      history.beginTransaction()
      history.endTransaction()

      expect(history.canUndo()).toBe(false)

      dispose()
    })
  })

  test('should limit retained undo snapshots and reset the history', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument, limit: 2})
      const firstDocument = renameFirstParameter(initialDocument, 'First')
      const secondDocument = renameFirstParameter(firstDocument, 'Second')
      const thirdDocument = renameFirstParameter(secondDocument, 'Third')

      history.setDocument(firstDocument)
      history.setDocument(secondDocument)
      history.setDocument(thirdDocument)
      const retained = history.entries()
      expect(retained).toHaveLength(3)
      expect(history.undoCount()).toBe(2)
      expect(history.undo()).toBe(true)
      expect(history.undo()).toBe(true)
      expect(history.document()).toBe(firstDocument)
      expect(history.undo()).toBe(false)

      history.resetDocument(initialDocument)
      expect(history.entries().map((entry) => entry.state)).toEqual(['current'])
      expect(history.goTo(retained[0]!.id)).toBe(false)
      expect(history.document()).toBe(initialDocument)
      expect(history.canUndo()).toBe(false)
      expect(history.canRedo()).toBe(false)

      dispose()
    })
  })
  test('should commit a pending gesture before jumping to a named history entry', () => {
    createRoot((dispose) => {
      const initialDocument = createDemoDocument()
      const history = useDocumentHistory({initialDocument})
      const initialId = history.entries()[0]!.id
      const edited = renameFirstParameter(initialDocument, 'Dragged')
      history.beginTransaction()
      history.setDocument(edited)
      expect(history.goTo(initialId)).toBe(true)
      expect(history.document()).toBe(initialDocument)
      expect(history.redoCount()).toBe(1)
      expect(history.redo()).toBe(true)
      expect(history.document()).toBe(edited)
      dispose()
    })
  })
})
