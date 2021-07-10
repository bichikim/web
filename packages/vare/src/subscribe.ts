import {getIdentifier, info} from 'src/info'
import {UnwrapNestedRefs} from 'src/types'
import {
  ComputedRef, watch, WatchCallback, WatchStopHandle,
} from 'vue-demi'
import {Action} from './act'
import {Computation, ComputationWritable} from './compute'
import {Mutation} from './mutate'

export type SubscribeHookArgs<Args extends any[]> = (current: Args, old: Args) => any
export type SubscribeHookValue<Value> = (current: Value, old: Value) => any

export type SubscribeTarget = Mutation<any> | Action<any> | Computation<any, any> | ComputationWritable<any, any>

export const watchAction = (target: SubscribeTarget, hook: WatchCallback<any>): WatchStopHandle => {
  const targetInfo = info.get(target)
  if (targetInfo?.watchFlag) {
    const {watchFlag} = targetInfo

    return watch(watchFlag, hook)
  }

  /* istanbul ignore next [no need to test without development env] */
  return () => false
}

export const watchTarget = (target: any, hook: SubscribeHookArgs<any>): WatchStopHandle =>
  watch(target, hook, {deep: true})

/**
 * start the subscription
 * @param mutation
 * @param hook
 */
export function subscribe<Args extends any[]> (mutation: Mutation<Args>, hook: SubscribeHookArgs<Args>): WatchStopHandle
export function subscribe<Args extends any[], Return = any> (
  action: Action<Args, Return>,
  hook: SubscribeHookArgs<Args>,
  ): WatchStopHandle
export function subscribe<Args extends any[], Return = any> (
  computation: Computation<Args, Return>,
  hook: SubscribeHookArgs<Args>,
  ): WatchStopHandle
export function subscribe<Args extends any[], Return = any> (
  computation: ComputationWritable<Args, Return>,
  hook: SubscribeHookArgs<Args>,
  ): WatchStopHandle
export function subscribe<T> (computed: ComputedRef<T>, hook: SubscribeHookValue<T>): WatchStopHandle
export function subscribe<T> (state: UnwrapNestedRefs<T>, hook: SubscribeHookValue<T>): WatchStopHandle
export function subscribe(
  target,
  hook,
) {
  const type = getIdentifier(target)
  // when Mutation, Action or Computation
  if (type === 'mutation' || type === 'action') {
    return watchAction(target, hook)
  }

  // state or any Ref
  return watchTarget(target, hook)
}
