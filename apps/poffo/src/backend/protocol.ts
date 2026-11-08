import {z} from 'zod'
import {documentSchema, patchSchema} from './command-schemas'

const origin = z.object({
  ownerId: z.string(),
  requestId: z.string(),
  transactionId: z.string().optional(),
})
const change = z.object({
  historyKind: z.enum(['edit', 'replace']),
  kind: z.enum(['edit', 'replace', 'reset', 'undo', 'redo']),
  origin,
  phase: z.enum(['update', 'commit', 'rollback']),
  revision: z.number(),
  sessionId: z.string(),
})
export const modelEventSchema = z.object({
  document: documentSchema.optional(),
  patch: z.array(patchSchema.element).optional(),
  sequence: z.number().int().nonnegative(),
  view: z.object({
    change: change.nullable(),
    entries: z.array(
      z.object({id: z.number(), state: z.enum(['past', 'current', 'future']), title: z.string()}),
    ),
    redoCount: z.number(),
    revision: z.number(),
    sessionId: z.string(),
    transaction: z.object({id: z.string(), ownerId: z.string()}).nullable(),
    undoCount: z.number(),
  }),
})

export const commandResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    revision: z.number(),
    sequence: z.number().optional(),
    sessionId: z.string(),
    value: z.unknown(),
  }),
  z.object({
    error: z.object({code: z.string(), message: z.string()}),
    ok: z.literal(false),
    sequence: z.number().optional(),
  }),
])

export const modelResultSchema = z.discriminatedUnion('ok', [
  z.object({changed: z.boolean(), ok: z.literal(true), revision: z.number()}),
  z.object({
    error: z.object({
      code: z.enum([
        'busy',
        'stale-revision',
        'stale-session',
        'transaction-missing',
        'inactive',
        'invalid-document',
      ]),
    }),
    ok: z.literal(false),
  }),
])

export const connectionSchema = z.object({
  pid: z.number(),
  sessionId: z.string(),
  token: z.string().min(1),
  url: z.url(),
  version: z.literal(1),
})
