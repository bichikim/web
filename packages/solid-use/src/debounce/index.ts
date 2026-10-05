import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {debounce, type DebouncedFunc, type DebounceSettings} from 'src/internal/debounce'
import {createScheduledCallback} from 'src/internal/create-scheduled-callback'

export type {DebouncedFunc, DebounceSettings}

export const createDebounce = <T extends (...args: any) => any>(
  callback: T,
  debounceMs: MaybeAccessor<number>,
  options: MaybeAccessor<DebounceSettings> = {},
) => {
  const debounceMsAccessor = resolveAccessor(debounceMs)
  const optionsAccessor = resolveAccessor(options)
  return createScheduledCallback<Parameters<T>>(() =>
    debounce(callback, debounceMsAccessor(), optionsAccessor()),
  )
}

export const useDebounce = createDebounce
