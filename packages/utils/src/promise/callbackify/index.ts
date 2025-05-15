import {isPromise} from 'src/is-promise'

export type CallbackifyHandle<S> = (error: unknown, value?: S | undefined) => unknown

export const callbackify = <S>(action: () => Promise<S> | S, handle: CallbackifyHandle<S>) => {
  let result

  try {
    result = action()
  } catch (error: unknown) {
    handle(error)

    return
  }

  if (isPromise(result)) {
    return result
      .then((data: any) => {
        handle(undefined, data)
      })
      .catch((error) => {
        handle(error)
      })
  }

  handle(undefined, result)

  return result
}
