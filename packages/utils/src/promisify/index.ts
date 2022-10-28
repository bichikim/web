import {AnyFunction, DropRightParameters, PopParameters} from 'src/types'

export type CallbackData<F> = F extends (error: any, data: infer P) => any ? P : unknown

export const promisify =
  <F extends AnyFunction>(_function: F) =>
  (...args: DropRightParameters<F>): Promise<CallbackData<PopParameters<F>>> => {
    return new Promise((resolve, reject) => {
      _function(...args, (error, result) => (error ? reject(error) : resolve(result)))
    })
  }
