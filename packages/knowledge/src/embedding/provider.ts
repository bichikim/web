export interface EmbeddingIdentity {
  readonly dimensions: number
  readonly model: string
  readonly provider: string
}

export interface EmbeddingBatch {
  readonly identity: EmbeddingIdentity
  readonly vectors: ReadonlyArray<ReadonlyArray<number>>
}

export interface EmptyEmbeddingInputError {
  readonly code: 'empty-embedding-input'
  readonly retryable: false
}

export interface EmbeddingRequestFailedError {
  readonly code: 'embedding-request-failed'
  readonly retryable: boolean
  readonly status: number
}

export interface EmbeddingUnavailableError {
  readonly code: 'embedding-unavailable'
  readonly detail: string
  readonly retryable: true
}

export interface InvalidEmbeddingResponseError {
  readonly code: 'invalid-embedding-response'
  readonly detail: string
  readonly retryable: false
}

export type EmbeddingError =
  | EmbeddingRequestFailedError
  | EmbeddingUnavailableError
  | EmptyEmbeddingInputError
  | InvalidEmbeddingResponseError

export interface EmbeddingFailure {
  readonly error: EmbeddingError
  readonly ok: false
}

export interface EmbeddingSuccess {
  readonly ok: true
  readonly value: EmbeddingBatch
}

export type EmbeddingBatchResult = EmbeddingFailure | EmbeddingSuccess

export interface DenseEmbeddingProvider {
  embed(inputs: ReadonlyArray<string>): Promise<EmbeddingBatchResult>
}
