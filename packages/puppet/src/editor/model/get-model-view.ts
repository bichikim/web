import type {ModelChange, ModelState, ModelView} from './types'

export const getModelView = (state: ModelState, change: ModelChange | null): ModelView => ({
  change,
  document: state.document,
  entries: state.snapshots.map((snapshot, index) => ({
    id: snapshot.id,
    state: index === state.index ? 'current' : index < state.index ? 'past' : 'future',
    title: snapshot.title,
  })),
  redoCount: state.snapshots.length - state.index - 1,
  revision: state.revision,
  sessionId: state.sessionId,
  transaction:
    state.transaction === null
      ? null
      : {id: state.transaction.id, ownerId: state.transaction.ownerId},
  undoCount: state.index,
})
