import type {ModelCommandResult, ModelRequestResult} from './types'

/** Observes completed local or remote requests without treating remote acceptance as completion. */
export const mapModelRequest = <Value>(
  result: ModelRequestResult,
  completed: (result: ModelCommandResult) => Value,
): Value | Promise<Value> =>
  result instanceof Promise ? result.then(completed) : completed(result)
