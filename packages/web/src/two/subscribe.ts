import {AnyFunction} from '@/types'
import {watch, computed, WatchStopHandle} from 'vue'
import {State} from './state'
import {Mutation, MUTATION_IDENTIFIER} from './mutate'
import {Action, ACTION_IDENTIFIER} from './act'
import {Computation, ComputationWritable, COMPUTATION_IDENTIFIER} from './compute'

export type SubscribeHook<Args extends any[]> = (...args: Args) => any

export interface Subscribe<Callback extends AnyFunction, Type> {
  subscribe(callback: Callback, type?: Type): void
  unsubscribe(func: AnyFunction, type?: Type): void
  clear(type?: Type): void
}

export const HOOKS = Symbol('hooks')

export type SubscribeTarget = Mutation<any> | Action<any> | Computation<any, any> | ComputationWritable<any, any>

export const setSubscribe = (target: SubscribeTarget, hook: SubscribeHook<any>) => {
  const hooks = target[HOOKS]

  if (hooks) {
    hooks.add(hook)
  }
}

export const deleteSubscribe = (target: SubscribeTarget, hook: SubscribeHook<any>) => {
  const hooks = target[HOOKS]

  if (hooks) {
    hooks.delete(hook)
  }
}

export const fireSubscribe = (target: SubscribeTarget, ...args: any[]) => {
  Promise.resolve().then(() => {
    const hooks = target[HOOKS]

    if (hooks) {
      hooks.forEach((hook) => {
        hook(...args)
      })
    }
  })
}

export const watchHolder = new WeakMap<any, WatchStopHandle>()

export const watchTarget = (target: any, hook: SubscribeHook<any>) => {
  const stop = watch(computed(() => target), hook, {deep: true})
  watchHolder.set(hook, stop)
}

export const stopWatchTarget = (hook: SubscribeHook<any>) => {
  const stop = watchHolder.get(hook)

  if (stop) {
    stop()
  }
}

export function subscribe <Args extends any[]>(mutation: Mutation<Args>, hook: SubscribeHook<Args>): void
export function subscribe <Args extends any[], Return = any>(action: Action<Args, Return>, hook: SubscribeHook<Args>): void
export function subscribe <Args extends any[], Return = any>(computation: Computation<Args, Return>, hook: SubscribeHook<Args>): void
export function subscribe <Args extends any[], Return = any>(computation: ComputationWritable<Args, Return>, hook: SubscribeHook<Args>): void
export function subscribe <T>(state: State<T>, hook: SubscribeHook<[T]>): void
export function subscribe(
  target,
  hook,
) {
  if (target[MUTATION_IDENTIFIER] || target[ACTION_IDENTIFIER] || target[COMPUTATION_IDENTIFIER]) {
    setSubscribe(target, hook)
    return
  }

  watchTarget(target, hook)
}

export function unSubscribe <Args extends any[]>(mutation: Mutation<Args>, hook: SubscribeHook<Args>): void
export function unSubscribe <Args extends any[], Return = any>(action: Action<Args, Return>, hook: SubscribeHook<Args>): void
export function unSubscribe <Args extends any[], Return = any>(computation: Computation<Args, Return>, hook: SubscribeHook<Args>): void
export function unSubscribe <Args extends any[], Return = any>(computation: ComputationWritable<Args, Return>, hook: SubscribeHook<Args>): void
export function unSubscribe(target, hook) {
  if (target[MUTATION_IDENTIFIER] || target[ACTION_IDENTIFIER] || target[COMPUTATION_IDENTIFIER]) {
    deleteSubscribe(target, hook)
    return
  }
  stopWatchTarget(hook)
}
