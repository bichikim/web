import {z} from 'zod'
import {locationSchema, type ViewerSession} from '../../shared/contracts'
import type {DraftStorage} from '../drafts/types'
import type {FileViewState} from './types'

const scrollSchema = z.object({left: z.number().nonnegative(), top: z.number().nonnegative()})
const stateSchema = z.object({
  codeScroll: scrollSchema.optional(),
  image: z
    .discriminatedUnion('mode', [
      z.object({mode: z.literal('fit')}),
      z.object({
        mode: z.literal('zoom'),
        scale: z.number().positive(),
        x: z.number(),
        y: z.number(),
      }),
    ])
    .optional(),
  original: z.boolean().optional(),
  pdf: z
    .object({
      fitting: z.boolean(),
      page: z.number().int().positive(),
      percent: z.number().positive(),
    })
    .optional(),
  previewScroll: scrollSchema.optional(),
  selection: locationSchema
    .extend({
      endColumn: z.number().int().positive().optional(),
      endLine: z.number().int().positive(),
    })
    .optional(),
})
const keyOf = (value: ViewerSession): string =>
  `winter-love.code-viewer.view:${JSON.stringify([value.session, value.workspace, value.document.location.path])}`

/** Reads and writes one session file's selected position and viewport in local storage. */
export const createLocalView = (storage: DraftStorage) => ({
  read: (value: ViewerSession): FileViewState | undefined => {
    const serialized = storage().getItem(keyOf(value))
    return serialized === null ? undefined : stateSchema.parse(JSON.parse(serialized))
  },
  write: (value: ViewerSession, state: FileViewState): void => {
    storage().setItem(keyOf(value), JSON.stringify(state))
  },
})
