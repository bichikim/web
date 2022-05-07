import {watch, WatchCallback, WatchOptions, WatchSource, WatchStopHandle} from 'vue-demi'
import {debounce as createDebounce} from '@winter-love/lodash'
export type MapSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V> ?
    Immediate extends true ?
      V | undefined : V : T[K] extends object ? Immediate extends true ? T[K] | undefined : T[K] : never;
}
export type MultiWatchSources = (WatchSource<unknown> | object)[]

export interface DebounceOptions {
  immediate?: boolean
  interval: number
}

export interface WatchExtendOptions<Immediate = boolean> extends WatchOptions<Immediate> {
  debounce?: DebounceOptions
  once?: boolean
}

export function watchExtended <
  T extends MultiWatchSources, Immediate extends Readonly<boolean> = false
>(
  sources: [...T],
  callback: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
  options?: WatchExtendOptions<Immediate>,
): WatchStopHandle

export function watchExtended <
  T extends Readonly<MultiWatchSources>,
  Immediate extends Readonly<boolean> = false
  >(
  sources: T,
  callback: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
  options?: WatchExtendOptions<Immediate>,
): WatchStopHandle

export function watchExtended <
  T,
  Immediate extends Readonly<boolean> = false
  >(
  sources: WatchSource<T>,
  callback: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchExtendOptions<Immediate>,
): WatchStopHandle

export function watchExtended <
  T extends object,
  Immediate extends Readonly<boolean> = false
  >(
  sources: T,
  callback: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchExtendOptions<Immediate>,
): WatchStopHandle

export function watchExtended(sources, callback, options?: WatchExtendOptions): any {
  const {once, debounce} = options ?? {}
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const beforeStop: (() => void)[] = []
  const stop: () => void = () => {
    beforeStop.forEach((fn) => fn())
  }
  let _callback = callback
  if (once) {
    const oldCallback = _callback
    _callback = (...args) => {
      oldCallback(...args)
      stop()
    }
  }

  if (debounce) {
    const oldCallback = _callback
    const debounceFunction = createDebounce(oldCallback, debounce.interval, {
      trailing: options?.immediate,
    })
    beforeStop.push(debounceFunction.cancel)
    _callback = debounceFunction
  }

  beforeStop.push(watch(sources, _callback, options))
  return stop
}
