import {isEqual} from 'es-toolkit'
import {getDocumentChangeTitle} from '../get-document-change-title'
import {reconcileSkinning} from '../internal/skinning'
import type {
  ModelAction,
  ModelApplied,
  ModelChange,
  ModelFinish,
  ModelMove,
  ModelOrigin,
  ModelResult,
  ModelState,
  ModelWrite,
} from './types'

const unchanged = (state: ModelState): ModelApplied => ({change: null, ok: true, state})

const changed = (
  state: ModelState,
  origin: ModelOrigin,
  transition: Pick<ModelChange, 'kind' | 'phase' | 'historyKind'>,
): ModelApplied => {
  const revision = state.revision + 1
  return {
    change: {
      ...transition,
      origin: {
        ownerId: origin.ownerId,
        requestId: origin.requestId,
        transactionId: origin.transactionId,
      },
      revision,
      sessionId: state.sessionId,
    },
    ok: true,
    state: {...state, revision},
  }
}

const commit = (state: ModelState, action: ModelWrite): ModelApplied => {
  const sequence = state.sequence + 1
  const snapshots = [
    ...state.snapshots.slice(0, state.index + 1),
    {
      document: action.document,
      id: sequence,
      kind: action.type,
      title: action.title ?? getDocumentChangeTitle(state.document, action.document),
    },
  ].slice(-(state.limit + 1))
  return changed(
    {
      ...state,
      document: action.document,
      index: snapshots.length - 1,
      sequence,
      snapshots,
      transaction: null,
    },
    action,
    {historyKind: action.type, kind: action.type, phase: 'commit'},
  )
}

const write = (state: ModelState, action: ModelWrite): ModelResult => {
  if (action.expectedSessionId !== undefined && action.expectedSessionId !== state.sessionId) {
    return {error: {code: 'stale-session'}, ok: false}
  }
  const {transaction} = state
  if (
    transaction !== null &&
    (action.type === 'replace' ||
      transaction.ownerId !== action.ownerId ||
      transaction.id !== action.transactionId)
  ) {
    return {error: {code: 'busy'}, ok: false}
  }
  if (action.expectedRevision !== state.revision) {
    return {error: {code: 'stale-revision'}, ok: false}
  }
  if (transaction === null && action.transactionId !== undefined) {
    return {error: {code: 'transaction-missing'}, ok: false}
  }
  const document =
    action.type === 'edit' ? reconcileSkinning(state.document, action.document) : action.document
  if (isEqual(document, state.document)) {
    return unchanged(state)
  }
  if (transaction === null) {
    return commit(state, {...action, document})
  }
  return changed(
    {
      ...state,
      document,
      transaction: {...transaction, title: transaction.title ?? action.title},
    },
    action,
    {historyKind: 'edit', kind: 'edit', phase: 'update'},
  )
}

const move = (state: ModelState, action: ModelMove): ModelResult => {
  if (state.transaction !== null) {
    return {error: {code: 'busy'}, ok: false}
  }
  const index =
    action.type === 'go-to'
      ? state.snapshots.findIndex((snapshot) => snapshot.id === action.id)
      : state.index + (action.type === 'undo' ? -1 : 1)
  const snapshot = state.snapshots[index]
  if (snapshot === undefined || index === state.index) {
    return unchanged(state)
  }
  // A jump may cross several edits; any crossed replacement invalidates old-model UI state.
  const crossed = state.snapshots.slice(
    Math.min(index, state.index) + 1,
    Math.max(index, state.index) + 1,
  )
  const historyKind = crossed.some((entry) => entry.kind === 'replace') ? 'replace' : 'edit'
  return changed({...state, document: snapshot.document, index}, action, {
    historyKind,
    kind: index < state.index ? 'undo' : 'redo',
    phase: 'commit',
  })
}

const cancel = (state: ModelState, origin: ModelOrigin): ModelApplied => {
  const {transaction} = state
  if (transaction === null) {
    return unchanged(state)
  }
  return changed(
    {...state, document: transaction.document, transaction: null},
    {...origin, transactionId: transaction.id},
    {historyKind: 'edit', kind: 'edit', phase: 'rollback'},
  )
}

const finish = (state: ModelState, action: ModelFinish): ModelResult => {
  const {transaction} = state
  if (transaction === null) {
    return {error: {code: 'transaction-missing'}, ok: false}
  }
  if (transaction.ownerId !== action.ownerId || transaction.id !== action.transactionId) {
    return {error: {code: 'busy'}, ok: false}
  }
  if (isEqual(transaction.document, state.document)) {
    return unchanged({...state, document: transaction.document, transaction: null})
  }
  return commit(
    {...state, document: transaction.document},
    {
      ...action,
      document: state.document,
      expectedRevision: state.revision,
      title: transaction.title,
      type: 'edit',
    },
  )
}

const cancelOwned = (state: ModelState, action: ModelFinish): ModelResult => {
  const {transaction} = state
  if (transaction === null) {
    return unchanged(state)
  }
  if (transaction.ownerId !== action.ownerId || transaction.id !== action.transactionId) {
    return {error: {code: 'busy'}, ok: false}
  }
  return cancel(state, action)
}

/** Applies one host command without mutating documents, history, or the caller's state. */
export const reduceModel = (state: ModelState, action: ModelAction): ModelResult => {
  switch (action.type) {
    case 'edit':
    case 'replace':
      return write(state, action)
    case 'undo':
    case 'redo':
    case 'go-to':
      return move(state, action)
    case 'begin': {
      if (state.transaction !== null) {
        return {error: {code: 'busy'}, ok: false}
      }
      return unchanged({
        ...state,
        transaction: {
          document: state.document,
          id: action.transactionId,
          ownerId: action.ownerId,
          title: action.title,
        },
      })
    }
    case 'commit':
      return finish(state, action)
    case 'cancel':
      return cancelOwned(state, action)
    case 'release':
      return state.transaction?.ownerId === action.ownerId
        ? cancel(state, action)
        : unchanged(state)
    case 'reset': {
      const sequence = state.sequence + 1
      return changed(
        {
          ...state,
          document: action.document,
          index: 0,
          sequence,
          snapshots: [{document: action.document, id: sequence, kind: 'edit', title: '문서 열기'}],
          transaction: null,
        },
        action,
        {historyKind: 'edit', kind: 'reset', phase: 'commit'},
      )
    }
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}
