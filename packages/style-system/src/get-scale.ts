/* eslint-disable max-params */
import {deepMemoize} from '@winter-love/utils'
import {MicroMemoize} from 'micro-memoize'

export {MicroMemoize}

export const rawGetScale = (
  theme: Record<string, any> | undefined,
  key: string | undefined,
  def?: Record<string, any> | undefined,
  props?: Record<string, any>,
  undef?: any,
) => {
  const _key = (key && key.split) ? key.split('.') : [key]
  let _object = theme

  for (const element of _key) {
    _object = _object ? _object[element ?? ''] : undef
  }
  return _object === undef ? def : _object
}

export const getScale = deepMemoize({maxSize: 100})(rawGetScale)
