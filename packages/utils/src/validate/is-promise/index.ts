import {isNull} from 'src/validate/is-null'

export function isPromise(value: any): value is Promise<any> {
  return (
    !isNull(value) &&
    typeof value === 'object' &&
    typeof value.then === 'function' &&
    typeof value.catch === 'function'
  )
}
