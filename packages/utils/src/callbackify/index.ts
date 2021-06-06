import {isPromise} from '../is-promise'

export const callbackify = <S>(
  action: () => Promise<S> | S,
  callback: (error: null, value: S | null) => any,
) => {
  let result
  try {
    result = action()
  } catch (error) {
    callback(error, null)
    return
  }

  if (isPromise(result)) {
    return result.then((data: S) => {
      callback(null, data)
    }).catch((error) => {
      callback(error, null)
    })
  }

  callback(null, result)
  return result
}
