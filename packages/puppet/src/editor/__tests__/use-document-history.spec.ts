import {createRoot} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../player'
import {useDocumentHistory} from '../use-document-history'

const renameFirstParameter = (document: PuppetDocument, name: string): PuppetDocument => ({
  ...document,
  parameters: document.parameters?.map((parameter, index) =>
    index === 0 ? {...parameter, name} : parameter,
  ),
})

describe('useDocumentHistory', () => {
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
      history.endTransaction()

      expect(history.undoCount()).toBe(1)
      expect(history.undo()).toBe(true)
      expect(history.document()).toBe(initialDocument)

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
      expect(history.undoCount()).toBe(2)
      expect(history.undo()).toBe(true)
      expect(history.undo()).toBe(true)
      expect(history.document()).toBe(firstDocument)
      expect(history.undo()).toBe(false)

      history.resetDocument(initialDocument)
      expect(history.document()).toBe(initialDocument)
      expect(history.canUndo()).toBe(false)
      expect(history.canRedo()).toBe(false)

      dispose()
    })
  })
})
