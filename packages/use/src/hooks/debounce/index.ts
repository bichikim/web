import {debounce} from '@winter-love/lodash'
import {createUseDelay} from 'src/hooks/delay'

export type UseDebounceHandle<Args extends any[], R> = (...args: Args) => R

export const useDebounce = createUseDelay((handle, wait, immediate) => {
  return debounce(handle, wait, {
    leading: immediate,
  })
})
