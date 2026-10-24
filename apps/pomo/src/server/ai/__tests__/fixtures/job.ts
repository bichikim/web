import type {AiJobRecord} from 'src/server/repositories/ai-jobs'

export const USER_ID = '019d0000-0000-7000-8000-000000000001'
export const JOB_ID = '019d0000-0000-7000-8000-000000000002'
export const NOW = new Date('2026-09-20T00:00:00.000Z')

export const createJob = (overrides: Partial<AiJobRecord> = {}): AiJobRecord => ({
  attemptCount: 0,
  capability: 'text',
  completedAt: null,
  createdAt: NOW,
  dispatchLeaseUntil: null,
  errorCode: null,
  errorMessage: null,
  estimatedCredits: null,
  id: JOB_ID,
  idempotencyKey: 'idempotency-key-1',
  intermediateCleanupAt: null,
  lastRunnerError: null,
  lastSubmissionError: null,
  modelId: 'gpt-5.6-luna',
  progress: 0,
  providerAcceptedAt: null,
  quotaUnits: 1,
  recoveryAttempts: 0,
  recoveryDeadlineAt: null,
  request: {messages: [{content: '안녕', role: 'user'}], parameters: {}},
  requestHash: 'request-hash',
  result: null,
  runnerJobId: null,
  settledCredits: null,
  startedAt: null,
  status: 'queued',
  submissionState: 'not_submitted',
  timeoutAt: new Date('2026-09-20T00:02:00.000Z'),
  updatedAt: NOW,
  usagePeriodEnd: '2026-10-01',
  usagePeriodStart: '2026-09-01',
  userId: USER_ID,
  ...overrides,
})
