import {z} from 'zod'
import {documentSchema, type ViewerSession} from '../../shared/contracts'
import type {DraftStorage, EditingDraft} from './types'

const snapshotSchema = z.object({
  drafts: z.array(
    z.object({
      base: documentSchema.pick({location: true, revision: true, source: true}),
      deleted: z.boolean(),
      source: z.string(),
    }),
  ),
  version: z.literal(1),
})
const storageKey = (value: ViewerSession): string =>
  `winter-love.code-viewer.drafts:${JSON.stringify([value.session, value.workspace])}`

/** Reads and writes unsaved snapshots in browser-local storage, scoped to one workspace session. */
export const createLocalDrafts = (storage: DraftStorage) => ({
  read: (value: ViewerSession): readonly EditingDraft[] => {
    const serialized = storage().getItem(storageKey(value))
    if (serialized === null) {
      return []
    }
    const snapshot = snapshotSchema.parse(JSON.parse(serialized))
    return snapshot.drafts.map((draft) => ({
      ...draft,
      session: {...value, document: {...draft.base, lines: []}},
    }))
  },
  write: (value: ViewerSession, drafts: readonly EditingDraft[]): void => {
    const scoped = drafts.filter(
      (draft) =>
        draft.session.session === value.session &&
        draft.session.workspace === value.workspace &&
        (draft.deleted || draft.source !== draft.base.source),
    )
    const destination = storage()
    const key = storageKey(value)
    if (scoped.length === 0) {
      destination.removeItem(key)
    } else {
      destination.setItem(
        key,
        JSON.stringify({
          drafts: scoped.map(({base, deleted, source}) => ({
            base: {location: base.location, revision: base.revision, source: base.source},
            deleted,
            source,
          })),
          version: 1,
        }),
      )
    }
  },
})
