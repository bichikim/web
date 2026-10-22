export type PuppetNumberPrecision = 'float32' | 'float64'

/** 격자 키폼의 보간 방식과 독립적으로 적용하는 축 정밀도와 키 경계 정책. */
export interface PuppetKeyformSampling {
  /** Parameter units for native Cubism snapping; omission keeps normalized interval progress. */
  readonly keyToleranceUnit?: 'parameter' | 'progress'
  /** 격자 연속 채널의 축·입력 정밀도. 생략하면 기존 Float64 연산을 유지한다. */
  readonly continuousPrecision?: PuppetNumberPrecision
  /** 이산 채널의 축·입력 정밀도. 생략하면 기존 Float32 연산을 유지한다. */
  readonly discretePrecision?: PuppetNumberPrecision
  /** 격자 구간 진행률을 끝점으로 맞추는 허용 오차(0 이상 0.5 미만). 생략하면 기존 0.0001, 0이면 정확한 끝점만 사용한다. */
  readonly keyTolerance?: number
}
