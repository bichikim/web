export interface ClampNumberOptions<Fallback = undefined> {
  /** 문제 값인지 판단한다. 생략하면 유한하지 않은 숫자를 거부하며, undefined는 이 함수와 무관하게 항상 문제 값으로 처리한다. */
  readonly isInvalid?: (value: number | undefined) => boolean
  /** 문제 값일 때 범위 제한 없이 반환한다. 생략하면 undefined를 반환한다. */
  readonly fallback?: Fallback
}

export interface ClampNumberFallbackOptions<Fallback> extends ClampNumberOptions<Fallback> {
  /** 문제 값일 때 범위 제한 없이 반환할 값이다. */
  readonly fallback: Fallback
}
