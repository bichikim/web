export interface SpeechSuccess<Value> {
  readonly ok: true
  readonly value: Value
}

export interface SpeechFailure<Error> {
  readonly error: Error
  readonly ok: false
}

export type SpeechResult<Value, Error> = SpeechFailure<Error> | SpeechSuccess<Value>

export const speechSuccess = <Value>(value: Value): SpeechSuccess<Value> => ({ok: true, value})

export const speechFailure = <Error>(error: Error): SpeechFailure<Error> => ({error, ok: false})
