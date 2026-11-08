import {z} from 'zod'
import {parseDocumentValue} from '@winter-love/puppet/player'

export const documentSchema = z.unknown().transform((value, context) => {
  const parsed = parseDocumentValue(value)
  if (!parsed.ok) {
    context.addIssue({code: 'custom', message: parsed.error.code})
    return z.NEVER
  }
  return parsed.document
})

const origin = {
  expectedRevision: z.number().int().nonnegative().optional(),
  ownerId: z.string().min(1),
  requestId: z.string().min(1),
  transactionId: z.string().optional(),
}
const write = {
  ...origin,
  document: documentSchema,
  expectedRevision: z.number().int().nonnegative(),
  expectedSessionId: z.string().optional(),
  title: z.string().optional(),
}

export const modelActionSchema = z.discriminatedUnion('type', [
  z.object({...write, type: z.literal('edit')}),
  z.object({...write, type: z.literal('replace')}),
  z.object({
    ...origin,
    title: z.string().optional(),
    transactionId: z.string(),
    type: z.literal('begin'),
  }),
  z.object({...origin, transactionId: z.string(), type: z.literal('commit')}),
  z.object({...origin, transactionId: z.string(), type: z.literal('cancel')}),
  z.object({...origin, type: z.literal('release')}),
  z.object({...origin, id: z.number().optional(), type: z.literal('undo')}),
  z.object({...origin, id: z.number().optional(), type: z.literal('redo')}),
  z.object({...origin, id: z.number().optional(), type: z.literal('go-to')}),
  z.object({
    ...origin,
    document: documentSchema,
    expectedRevision: z.number().int().nonnegative(),
    type: z.literal('reset'),
  }),
])

const MAXIMUM_PATCHES = 128

export const patchSchema = z
  .array(
    z.discriminatedUnion('op', [
      z.object({op: z.literal('add'), path: z.string(), value: z.unknown()}),
      z.object({op: z.literal('replace'), path: z.string(), value: z.unknown()}),
      z.object({op: z.literal('remove'), path: z.string()}),
      z.object({op: z.literal('test'), path: z.string(), value: z.unknown()}),
      z.object({from: z.string(), op: z.literal('move'), path: z.string()}),
      z.object({from: z.string(), op: z.literal('copy'), path: z.string()}),
    ]),
  )
  .min(1)
  .max(MAXIMUM_PATCHES)

export const patchInputSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  patch: patchSchema,
})

export const commandRequestSchema = z.object({
  input: z.unknown().optional(),
  operation: z.string(),
  requestId: z.string().min(1),
})

export type CommandRequest = z.infer<typeof commandRequestSchema>
