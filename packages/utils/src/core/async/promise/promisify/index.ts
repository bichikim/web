import {AnyFunction, DropRightParameters, PopParameters} from 'src/core/types/shared'

export type CallbackData<F> = F extends (error: any, data: infer P) => any ? P : unknown

export const promisify = <F extends AnyFunction>(_function: F) => {
  return function promisified(
    this: ThisParameterType<F>,
    ...args: DropRightParameters<F>
  ): Promise<CallbackData<PopParameters<F>>> {
    return new Promise((resolve, reject) => {
      const callback = (error: unknown, result: CallbackData<PopParameters<F>>) => {
        if (error !== null && error !== undefined) {
          reject(error)
          return
        }

        resolve(result)
      }

      Reflect.apply(_function, this, [...args, callback])
    })
  }
}
