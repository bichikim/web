import {z} from 'zod'
import {MAX_ATTACHMENT_NAME_BYTES} from './context-attachment-filename'
import {MAX_CONTEXT_BYTES} from './context-limits'

export const MAX_ATTACHMENT_BYTES = 20_971_520
export const chatAttachmentSchema = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('file'), path: z.string().min(1)}),
  z.object({
    filename: z.string().min(1).max(MAX_ATTACHMENT_NAME_BYTES).optional(),
    kind: z.literal('text'),
    text: z.string().max(MAX_CONTEXT_BYTES),
  }),
])
export type ChatAttachment = z.infer<typeof chatAttachmentSchema>
