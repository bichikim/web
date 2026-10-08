export const API_AI_POLICY = {
  cloudGenerationMilliseconds: 120_000,
  historyGenerationMilliseconds: 1_800_000,
  invocationMilliseconds: 200_000,
  maximumAttempts: 5,
  maximumBatch: 10,
  maximumQueuedPerUser: 10,
  maximumRunningPerUser: 2,
  queueMilliseconds: 900_000,
  recoveryDelayMilliseconds: 60_000,
  retryMilliseconds: 30_000,
} as const
