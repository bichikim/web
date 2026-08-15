export interface TextMoodSuccess<Value> {
  readonly ok: true
  readonly value: Value
}

export interface TextMoodFailure<Error> {
  readonly error: Error
  readonly ok: false
}

export type TextMoodResult<Value, Error> = TextMoodFailure<Error> | TextMoodSuccess<Value>

export const textMoodSuccess = <Value>(value: Value): TextMoodSuccess<Value> => ({ok: true, value})

export const textMoodFailure = <Error>(error: Error): TextMoodFailure<Error> => ({error, ok: false})
