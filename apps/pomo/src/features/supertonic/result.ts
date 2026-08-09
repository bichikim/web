export interface SuccessResult<Value> {
  readonly ok: true
  readonly value: Value
}

export interface FailureResult<Failure> {
  readonly error: Failure
  readonly ok: false
}

export type Result<Value, Failure> = FailureResult<Failure> | SuccessResult<Value>

export const successResult = <Value>(value: Value): SuccessResult<Value> => ({ok: true, value})

export const failureResult = <Failure>(error: Failure): FailureResult<Failure> => ({
  error,
  ok: false,
})
