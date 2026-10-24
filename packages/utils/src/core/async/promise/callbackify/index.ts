import {isPromise} from 'src/core/predicates/is-promise'

export type CallbackifyHandle<S> = (error: unknown, value?: S | undefined) => unknown

export const callbackify = <S>(
  action: () => Promise<S> | S,
  handle: CallbackifyHandle<S>,
): Promise<void> | S | undefined => {
  let result: Promise<S> | S

  try {
    result = action()
  } catch (error: unknown) {
    handle(error)

    return
  }

  if (isPromise(result)) {
    const promiseResult = result as Promise<S>

    return promiseResult.then(
      (data) => {
        handle(undefined, data)
      },
      (error: unknown) => {
        handle(error)
      },
    )
  }

  const syncResult = result as S

  handle(undefined, syncResult)

  return syncResult
}
