import {isPromise} from '../is-promise'

export const callbackify = <S>(
  action: () => Promise<S> | S,
  callback: (error: undefined | Error, value?: S | undefined) => any,
) => {
  let result
  try {
    result = action()
  } catch (error) {
    callback(error)
    return
  }

  if (isPromise(result)) {
    return result.then((data: S) => {
      callback(undefined, data)
    }).catch((error) => {
      callback(error)
    })
  }

  callback(undefined, result)
  return result
}
