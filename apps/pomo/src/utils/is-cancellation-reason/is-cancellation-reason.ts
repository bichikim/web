/** 런타임의 오류 클래스와 관계없이 표준 이름으로 AbortError를 판별한다. */
export const isAbortError = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'name' in value && value.name === 'AbortError'

/** AbortError이거나 취소된 신호의 사유와 정확히 같은지 판별한다. */
export const isCancellationReason = (value: unknown, signal?: AbortSignal | null): boolean =>
  isAbortError(value) || (signal?.aborted === true && value === signal.reason)
