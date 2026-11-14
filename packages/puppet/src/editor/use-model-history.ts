import {onCleanup} from 'solid-js'
import type {PuppetDocument} from '../player/document'
import type {ModelBinding, ModelCommandResult, ModelHistoryEntry, ModelOrigin} from './model'

export interface ModelHistoryBinding {
  readonly document: () => PuppetDocument
  readonly entries: () => ReadonlyArray<ModelHistoryEntry>
  readonly canUndo: () => boolean
  readonly canRedo: () => boolean
  readonly undoCount: () => number
  readonly redoCount: () => number
  readonly beginTransaction: (title?: string) => ModelCommandResult
  readonly endTransaction: () => ModelCommandResult
  readonly setDocument: (document: PuppetDocument, title?: string) => ModelCommandResult
  readonly replaceDocument: (document: PuppetDocument, title?: string) => ModelCommandResult
  readonly resetDocument: (document: PuppetDocument) => ModelCommandResult
  readonly undo: () => boolean
  readonly redo: () => boolean
  readonly goTo: (id: number) => boolean
}

/** Delegates document and history ownership to the host; only gesture identity is local. */
export const useModelHistory = (
  model: ModelBinding,
  ownerId: string,
  isActive: () => boolean = () => true,
): ModelHistoryBinding => {
  let released = false
  const writable = () => !released && isActive()
  let sequence = 0
  let transactionId: string | undefined
  const origin = (): ModelOrigin => {
    const current = model.read().transaction
    if (
      transactionId !== undefined &&
      (current?.id !== transactionId || current?.ownerId !== ownerId)
    ) {
      transactionId = undefined
    }
    sequence += 1
    return {ownerId, requestId: `${ownerId}:${sequence}`, transactionId}
  }
  const setDocument = (document: PuppetDocument, title?: string): ModelCommandResult => {
    if (!writable()) {
      return {error: {code: 'inactive'}, ok: false}
    }
    const current = model.read()
    return model.request({
      ...origin(),
      document,
      expectedRevision: current.revision,
      title,
      type: 'edit',
    })
  }
  const beginTransaction = (title?: string): ModelCommandResult => {
    if (!writable()) {
      return {error: {code: 'inactive'}, ok: false}
    }
    const request = origin()
    if (request.transactionId !== undefined) {
      return {changed: false, ok: true, revision: model.read().revision}
    }
    const id = request.requestId
    const result = model.request({...request, title, transactionId: id, type: 'begin'})
    if (result.ok) {
      transactionId = id
    }
    return result
  }
  const endTransaction = (): ModelCommandResult => {
    if (!writable()) {
      return {error: {code: 'inactive'}, ok: false}
    }
    if (transactionId === undefined) {
      return {changed: false, ok: true, revision: model.read().revision}
    }
    const request = origin()
    if (request.transactionId === undefined) {
      return {changed: false, ok: true, revision: model.read().revision}
    }
    const result = model.request({...request, transactionId: request.transactionId, type: 'commit'})
    if (result.ok) {
      transactionId = undefined
    }
    return result
  }
  const move = (type: 'undo' | 'redo' | 'go-to', id?: number): boolean => {
    if (!writable()) {
      return false
    }
    const result = model.request({...origin(), id, type})
    return result.ok && result.changed
  }
  onCleanup(() => {
    released = true
    model.request({...origin(), type: 'release'})
  })
  return {
    beginTransaction,
    canRedo: () => {
      const state = model.read()
      return state.transaction === null && state.redoCount > 0
    },
    canUndo: () => {
      const state = model.read()
      return state.transaction === null && state.undoCount > 0
    },
    document: model.document,
    endTransaction,
    entries: () => model.read().entries,
    goTo: (id: number) => move('go-to', id),
    redo: () => move('redo'),
    redoCount: () => model.read().redoCount,
    replaceDocument: (document: PuppetDocument, title?: string) => {
      if (!writable()) {
        return {error: {code: 'inactive'}, ok: false}
      }
      const current = model.read()
      return model.request({
        ...origin(),
        document,
        expectedRevision: current.revision,
        title,
        type: 'replace',
      })
    },
    resetDocument: (document: PuppetDocument) => {
      if (!writable()) {
        return {error: {code: 'inactive'}, ok: false}
      }
      transactionId = undefined
      return model.request({...origin(), document, type: 'reset'})
    },
    setDocument,
    undo: () => move('undo'),
    undoCount: () => model.read().undoCount,
  }
}
