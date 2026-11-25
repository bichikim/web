import {z} from 'zod'
const MAXIMUM_MODEL_LENGTH = 128

export const poffoConversationSchema = z.object({
  codexModel: z.string().trim().min(1).max(MAXIMUM_MODEL_LENGTH).optional(),
  provider: z.enum(['local', 'codex']).default('local'),
})
export type PoffoConversation = z.infer<typeof poffoConversationSchema>
export const DEFAULT_POFFO_CONVERSATION: PoffoConversation = {provider: 'local'}
