export type ApiAiKind = 'cloud-text' | 'history'
export type ApiAiStatus =
  | 'queued'
  | 'submitting'
  | 'running'
  | 'recovery_pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
export type ApiAiAttemptState =
  | 'submitting'
  | 'running'
  | 'unknown'
  | 'succeeded'
  | 'rejected'
  | 'failed'
  | 'cancelled'

export interface ApiAiResponse {
  readonly failureCode: string | null
  readonly fallback: boolean
  readonly metadata: Readonly<Record<string, string>>
  readonly model: string
  readonly outputText: string
  readonly responseId: string
  readonly searchSourceUrls: ReadonlyArray<string>
  readonly status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'incomplete'
  readonly tokenCount: number | null
}

export interface ApiAiTransport {
  readonly fetch: typeof globalThis.fetch
}

export interface ApiAiProvider {
  readonly id: string
  readonly poolId: string
  readonly baseUrl: string
  readonly apiKey: string
  readonly webhookSecret?: string
  readonly protocol?: 'openai-responses-background' | 'openrouter-responses-queue'
  readonly models: Readonly<Partial<Record<ApiAiKind, string>>>
}

export interface ApiAiJobInput {
  readonly id: string
  readonly kind: ApiAiKind
  readonly ownerId: string | null
  readonly body: Readonly<Record<string, unknown>>
  readonly requestHash: string
  readonly queueExpiresAt: Date
  readonly generationMilliseconds: number
}

export interface ApiAiJobReference {
  readonly id: string
}

export interface ApiAiJob extends ApiAiJobReference {
  readonly kind: ApiAiKind
  readonly ownerId: string | null
  readonly body: Readonly<Record<string, unknown>>
  readonly status: ApiAiStatus
  readonly activeAttemptId: string | null
  readonly cancelRequestedAt: Date | null
  readonly result: ApiAiResponse | null
}

export interface ApiAiAttempt {
  readonly id: string
  readonly jobId: string
  readonly providerId: string
  readonly modelId: string
  readonly responseId: string | null
  readonly deadlineAt: Date
}

export interface ApiAiCallback {
  readonly id: string
  readonly eventId: string
  readonly eventType: ApiAiWebhookEvent['type']
  readonly providerId: string
  readonly responseId: string
}

export interface ApiAiClaim {
  readonly attempt: ApiAiAttempt
  readonly job: ApiAiJob
  readonly provider: ApiAiProvider
}

interface ApiAiJobAccepted {
  readonly kind: 'created' | 'existing'
  readonly job: ApiAiJob
}
interface ApiAiJobDeclined {
  readonly kind: 'conflict' | 'full'
}
export type CreateApiAiJobResult = ApiAiJobAccepted | ApiAiJobDeclined

export interface ApiAiRepository {
  readonly resolveApiAiJobProviders: (
    jobId: string,
    providers: ReadonlyArray<ApiAiProvider>,
    defaults: ReadonlyArray<ApiAiProvider>,
  ) => Promise<ReadonlyArray<ApiAiProvider>>
  readonly expireQueuedApiAiJobs: (now: Date) => Promise<void>
  readonly claimApiAiJob: (
    jobId: string,
    providers: ReadonlyArray<ApiAiProvider>,
    now: Date,
    attemptId: string,
  ) => Promise<ApiAiClaim | null>
  readonly claimApiAiAttemptRecovery: (attemptId: string, now: Date) => Promise<boolean>
  readonly claimApiAiCallback: (callbackId: string, now: Date) => Promise<boolean>
  readonly claimApiAiJobDelivery: (jobId: string, now: Date) => Promise<boolean>
  readonly recordApiAiSubmissionError: (
    attemptId: string,
    error: ApiAiSubmissionError,
    now: Date,
  ) => Promise<void>
  readonly recordApiAiResponse: (
    attemptId: string,
    response: ApiAiResponse,
    now: Date,
  ) => Promise<void>
  readonly listUndeliveredApiAiJobs: (now: Date) => Promise<ReadonlyArray<ApiAiJob>>
  readonly markApiAiJobDelivered: (jobId: string, now: Date) => Promise<void>
  readonly listPendingApiAiCallbacks: (now: Date) => Promise<ReadonlyArray<ApiAiCallback>>
  readonly findApiAiResponseAttempt: (
    providerId: string,
    responseId: string,
  ) => Promise<ApiAiAttempt | null>
  readonly findApiAiAttempt: (attemptId: string) => Promise<ApiAiAttempt | null>
  readonly findApiAiJob: (jobId: string) => Promise<ApiAiJob | null>
  readonly markApiAiCallbackProcessed: (callbackId: string, now: Date) => Promise<void>
  readonly listActiveApiAiAttempts: (now: Date) => Promise<ReadonlyArray<ApiAiAttempt>>
  readonly failUnknownApiAiJob: (jobId: string, now: Date) => Promise<void>
  readonly listQueuedApiAiJobs: (now: Date) => Promise<ReadonlyArray<ApiAiJobReference>>
}

export interface ApiAiServiceDependencies {
  readonly repository: ApiAiRepository
  readonly adapter: ApiAiAdapter
  readonly queue?: {
    readonly adapter: Pick<ApiAiAdapter, 'submit'>
    readonly enqueue: (jobId: string) => Promise<void>
    readonly monitorBackground?: boolean
  }
  readonly providers: () => ReadonlyArray<ApiAiProvider>
  readonly defaultProviders?: () => ReadonlyArray<ApiAiProvider>
  readonly clock: () => Date
  readonly createAttemptId: () => string
  readonly deliver: (job: ApiAiJob) => Promise<void>
  readonly legacyWebhook: (event: ApiAiWebhookEvent) => Promise<void>
}

export interface ApiAiService {
  readonly complete: () => Promise<void>
  readonly dispatch: (deadline?: number) => Promise<void>
  readonly dispatchJob: (jobId: string, deadline?: number) => Promise<void>
  readonly executeQueuedJob: (jobId: string) => Promise<void>
  readonly recover: () => Promise<void>
}

export interface ApiAiSubmissionError {
  readonly scope?: 'model' | 'pool'
  readonly acceptance: 'rejected' | 'unknown'
  readonly fallback: boolean
  readonly disabled: boolean
  readonly retryAt: number
  readonly message: string
}

export interface ApiAiWebhookEvent {
  readonly id: string
  readonly type:
    | 'response.cancelled'
    | 'response.completed'
    | 'response.failed'
    | 'response.incomplete'
  readonly data: {readonly id: string}
}

export interface ApiAiAdapter {
  readonly submit: (
    provider: ApiAiProvider,
    body: Readonly<Record<string, unknown>>,
    attemptId: string,
    timeoutMilliseconds?: number,
  ) => Promise<ApiAiResponse>
  readonly retrieve: (provider: ApiAiProvider, responseId: string) => Promise<ApiAiResponse>
  readonly cancel: (provider: ApiAiProvider, responseId: string) => Promise<ApiAiResponse>
}
