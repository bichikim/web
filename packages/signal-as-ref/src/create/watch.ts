import type {WatchCallback, WatchOptions, WatchSource, WatchStopHandle} from 'vue'
import type {IsRef} from './is-ref'

export type MultiWatchSources = (WatchSource<unknown> | object)[]

export type MapSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V>
    ? Immediate extends true
      ? V | undefined
      : V
    : T[K] extends object
    ? Immediate extends true
      ? T[K] | undefined
      : T[K]
    : never
}

export interface Watch {
  <T extends MultiWatchSources, Immediate extends Readonly<boolean> = false>(
    sources: [...T],
    cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
    options?: WatchOptions<Immediate>,
  ): WatchStopHandle
  //
  <T extends Readonly<MultiWatchSources>, Immediate extends Readonly<boolean> = false>(
    source: T,
    cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
    options?: WatchOptions<Immediate>,
  ): WatchStopHandle
  //
  <T, Immediate extends Readonly<boolean> = false>(
    source: WatchSource<T>,
    cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
    options?: WatchOptions<Immediate>,
  ): WatchStopHandle
  //
  <T extends object, Immediate extends Readonly<boolean> = false>(
    source: T,
    cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
    options?: WatchOptions<Immediate>,
  ): WatchStopHandle
}

export type Effect = (compute: () => unknown) => () => void

export const createWatch = (effect: Effect, isRef: IsRef): Watch => {
  return ((sources, callback, options: WatchOptions = {}) => {
    const {flush, immediate, deep, onTrack, onTrigger} = options
    if (flush || deep || onTrack || onTrigger) {
      console.warn('flush, deep, onTrack and onTrigger are not supported')
    }
    let old = Array.isArray(sources) ? [] : undefined
    let next = Boolean(immediate)
    const returnSource = (sources) => {
      if (Array.isArray(sources)) {
        return sources.map((item) => item.value)
      }
      if (typeof sources === 'function') {
        return sources()
      }
      if (isRef(sources)) {
        return sources.value
      }
    }
    const compute = () => {
      const _sources = returnSource(sources)
      if (next) {
        callback(_sources, old)
      }
      old = _sources
      next = true
    }
    effect(compute)
  }) as any
}
