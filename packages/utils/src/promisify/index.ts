import {AnyFunction, DropRightParameters, PickLastParameters} from 'src/types'

export type CallbackData<F> = F extends (error: any, data: infer P) => any ? P : unknown

export const promisify = <F extends AnyFunction>(function_: F) => (
  ...args: DropRightParameters<F>
): Promise<CallbackData<PickLastParameters<F>>> => {
  return new Promise((resolve, reject) => {
    function_(...args, (error, result) => (error ? reject(error) : resolve(result)))
  })
}
