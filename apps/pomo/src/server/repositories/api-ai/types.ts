import type {apiAiAttempts, apiAiJobs, TransactionalDatabase} from 'src/server/database'

export type ApiAiTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]
export type StoredApiAiJob = typeof apiAiJobs.$inferSelect
export type StoredApiAiAttempt = typeof apiAiAttempts.$inferSelect
