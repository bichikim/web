import {reconcileSkinning} from './internal/skinning'
import {getDocumentChangeTitle} from './get-document-change-title'
import {type Accessor, batch, createMemo, createSignal} from 'solid-js'
import {isEqual} from 'es-toolkit'

import type {PuppetDocument} from '../player/document'

const DEFAULT_HISTORY_LIMIT = 100

export interface UseDocumentHistoryProps {
  readonly initialDocument: PuppetDocument
  readonly limit?: number
}

export interface DocumentHistoryEntry {
  readonly id: number
  readonly title: string
  readonly state: 'past' | 'current' | 'future'
}

interface DocumentSnapshot {
  readonly id: number
  readonly title: string
  readonly document: PuppetDocument
}

interface HistoryState {
  readonly snapshots: ReadonlyArray<DocumentSnapshot>
  readonly index: number
}

export interface DocumentHistoryResult {
  readonly committedDocument: Accessor<PuppetDocument>
  readonly beginTransaction: (title?: string) => void
  readonly canRedo: Accessor<boolean>
  readonly canUndo: Accessor<boolean>
  readonly document: Accessor<PuppetDocument>
  readonly endTransaction: () => void
  readonly entries: Accessor<ReadonlyArray<DocumentHistoryEntry>>
  readonly goTo: (id: number) => boolean
  readonly redo: () => boolean
  readonly redoCount: Accessor<number>
  readonly resetDocument: (document: PuppetDocument) => void
  readonly setDocument: (document: PuppetDocument, title?: string) => void
  readonly undo: () => boolean
  readonly undoCount: Accessor<number>
}

export const useDocumentHistory = (props: UseDocumentHistoryProps): DocumentHistoryResult => {
  const limit = Math.max(1, Math.floor(props.limit ?? DEFAULT_HISTORY_LIMIT))
  const [document, setCurrentDocument] = createSignal(props.initialDocument)
  const [committedDocument, setCommittedDocument] = createSignal(props.initialDocument)
  const [state, setState] = createSignal<HistoryState>({
    index: 0,
    snapshots: [{document: props.initialDocument, id: 0, title: '문서 열기'}],
  })
  let sequence = 0
  let transactionStart: PuppetDocument | null = null
  let transactionTitle: string | undefined
  const entries = createMemo(() => {
    const current = state()
    return current.snapshots.map(
      ({id, title}, index): DocumentHistoryEntry => ({
        id,
        state: index === current.index ? 'current' : index < current.index ? 'past' : 'future',
        title,
      }),
    )
  })
  const commit = (before: PuppetDocument, next: PuppetDocument, title?: string) => {
    sequence += 1
    const current = state()
    const snapshots = [
      ...current.snapshots.slice(0, current.index + 1),
      {document: next, id: sequence, title: title ?? getDocumentChangeTitle(before, next)},
    ].slice(-(limit + 1))
    batch(() => {
      setState({index: snapshots.length - 1, snapshots})
      setCommittedDocument(next)
    })
  }
  const endTransaction = () => {
    const snapshot = transactionStart
    const title = transactionTitle
    transactionStart = null
    transactionTitle = undefined
    const current = document()
    if (snapshot !== null) {
      if (isEqual(current, snapshot)) {
        setCurrentDocument(snapshot)
      } else {
        commit(snapshot, current, title)
      }
    }
  }
  const setDocument = (nextDocument: PuppetDocument, title?: string) => {
    const current = document()
    if (isEqual(nextDocument, current)) {
      return
    }
    const reconciled = reconcileSkinning(current, nextDocument)
    batch(() => {
      setCurrentDocument(reconciled)
      if (transactionStart === null) {
        commit(current, reconciled, title)
      } else {
        transactionTitle ??= title
      }
    })
  }
  const moveTo = (index: number) => {
    const current = state()
    const snapshot = current.snapshots[index]
    if (snapshot === undefined || index === current.index) {
      return false
    }
    batch(() => {
      setState({...current, index})
      setCurrentDocument(snapshot.document)
      setCommittedDocument(snapshot.document)
    })
    return true
  }
  const undo = () => {
    endTransaction()
    return moveTo(state().index - 1)
  }
  const redo = () => {
    endTransaction()
    return moveTo(state().index + 1)
  }
  return {
    beginTransaction(title) {
      transactionStart ??= document()
      transactionTitle ??= title
    },
    canRedo: () => {
      const current = state()
      return current.index < current.snapshots.length - 1
    },
    canUndo: () => state().index > 0,
    committedDocument,
    document,
    endTransaction,
    entries,
    goTo(id) {
      endTransaction()
      return moveTo(state().snapshots.findIndex((snapshot) => snapshot.id === id))
    },
    redo,
    redoCount: () => {
      const current = state()
      return current.snapshots.length - current.index - 1
    },
    resetDocument(nextDocument) {
      transactionStart = null
      transactionTitle = undefined
      sequence += 1
      batch(() => {
        setState({
          index: 0,
          snapshots: [{document: nextDocument, id: sequence, title: '문서 열기'}],
        })
        setCurrentDocument(nextDocument)
        setCommittedDocument(nextDocument)
      })
    },
    setDocument,
    undo,
    undoCount: () => state().index,
  }
}
