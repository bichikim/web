import {type Accessor, createSignal} from 'solid-js'

import type {PuppetDocument} from '../player/document'

const DEFAULT_HISTORY_LIMIT = 100

export interface UseDocumentHistoryProps {
  readonly initialDocument: PuppetDocument
  readonly limit?: number
}

export interface DocumentHistoryResult {
  readonly beginTransaction: () => void
  readonly canRedo: Accessor<boolean>
  readonly canUndo: Accessor<boolean>
  readonly document: Accessor<PuppetDocument>
  readonly endTransaction: () => void
  readonly redo: () => boolean
  readonly redoCount: Accessor<number>
  readonly resetDocument: (document: PuppetDocument) => void
  readonly setDocument: (document: PuppetDocument) => void
  readonly undo: () => boolean
  readonly undoCount: Accessor<number>
}

const retainLatest = (
  documents: ReadonlyArray<PuppetDocument>,
  limit: number,
): ReadonlyArray<PuppetDocument> => documents.slice(Math.max(0, documents.length - limit))

export const useDocumentHistory = (props: UseDocumentHistoryProps): DocumentHistoryResult => {
  const limit = Math.max(1, Math.floor(props.limit ?? DEFAULT_HISTORY_LIMIT))
  const [document, setCurrentDocument] = createSignal(props.initialDocument)
  const [past, setPast] = createSignal<ReadonlyArray<PuppetDocument>>([])
  const [future, setFuture] = createSignal<ReadonlyArray<PuppetDocument>>([])
  let transactionStart: PuppetDocument | null = null

  const appendPast = (snapshot: PuppetDocument) => {
    setPast((documents) => retainLatest([...documents, snapshot], limit))
  }
  const endTransaction = () => {
    const snapshot = transactionStart
    transactionStart = null

    if (snapshot !== null && document() !== snapshot) {
      appendPast(snapshot)
    }
  }
  const setDocument = (nextDocument: PuppetDocument) => {
    const currentDocument = document()

    if (nextDocument === currentDocument) {
      return
    }

    if (transactionStart === null) {
      appendPast(currentDocument)
    }
    setFuture([])
    setCurrentDocument(nextDocument)
  }
  const undo = () => {
    endTransaction()
    const previousDocuments = past()
    const previousDocument = previousDocuments.at(-1)
    if (previousDocument === undefined) {
      return false
    }

    setPast(previousDocuments.slice(0, -1))
    setFuture((documents) => [document(), ...documents])
    setCurrentDocument(previousDocument)
    return true
  }
  const redo = () => {
    endTransaction()
    const nextDocuments = future()
    const [nextDocument] = nextDocuments
    if (nextDocument === undefined) {
      return false
    }

    appendPast(document())
    setFuture(nextDocuments.slice(1))
    setCurrentDocument(nextDocument)
    return true
  }

  return {
    beginTransaction() {
      transactionStart ??= document()
    },
    canRedo: () => future().length > 0,
    canUndo: () => past().length > 0,
    document,
    endTransaction,
    redo,
    redoCount: () => future().length,
    resetDocument(nextDocument) {
      transactionStart = null
      setPast([])
      setFuture([])
      setCurrentDocument(nextDocument)
    },
    setDocument,
    undo,
    undoCount: () => past().length,
  }
}
