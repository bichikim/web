import {AnyFunction, DropRightParameters} from 'src/types'

export const promisify = <F extends AnyFunction>(function_: F) => (...args: DropRightParameters<F>) => {
  return new Promise((resolve, reject) => {
    console.log(function_)
    function_(...args, (error, result) => (error ? reject(error) : resolve(result)))
  })
}
