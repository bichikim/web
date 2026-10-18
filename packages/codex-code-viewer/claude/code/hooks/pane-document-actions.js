import {followDocument} from './pane-state.ts'
const selected = (state) => state.documents.find((document) => document.path === state.active)
/** Coordinates revision-checked saves and explicit draft disposal at the file boundary. */
export function createDocumentActions(context) {
  return {
    discard: async () => {
      const state = context.get()
      const current = selected(state)
      const {document} = await context.request('code.open', {
        column: 1,
        line: current.line,
        path: current.path,
      })
      context.set(
        followDocument(
          {...state, documents: state.documents.filter((entry) => entry.path !== current.path)},
          document,
        ),
      )
      context.reset()
      await context.persist()
    },
    save: async () => {
      const state = context.get()
      const current = selected(state)
      const saved = await context.request('code.write', {
        path: current.path,
        revision: current.revision,
        source: current.source,
      })
      context.set({
        ...state,
        documents: state.documents.map((entry) =>
          entry.path === current.path
            ? {
                ...entry,
                base: saved.document.source,
                conflict: false,
                revision: saved.document.revision,
              }
            : entry,
        ),
      })
      await context.persist()
    },
  }
}
