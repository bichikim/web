import {isPromise} from 'src/validate/is-promise'

export type CallbackifyHandle<S> = (error: undefined | Error, value?: S | undefined) => unknown

export const callbackify = <S>(action: () => Promise<S> | S, handle: CallbackifyHandle<S>) => {
  let result
  try {
    result = action()
  } catch (error: any) {
    handle(error)
    return
  }

  if (isPromise(result)) {
    return result
      .then((data: S) => {
        handle(undefined, data)
      })
      .catch((error) => {
        handle(error)
      })
  }

  handle(undefined, result)
  return result
}
