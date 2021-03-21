import {AnyFunction} from '@/types'
import {watch, computed} from 'vue'
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

export const subscribeHolder = new WeakMap<Mutation<any> | Action<any> | Computation<any, any>, SubscribeHook<any[]>[]>()

export const setSubscribe = (target, hook) => {
  let triggers = subscribeHolder.get(target)

  if (!triggers) {
    triggers = []
    subscribeHolder.set(target, triggers)
  }

  triggers.push(hook)
}

export const fireSubscribe = (target, ...args: any[]) => {
  Promise.resolve().then(() => {
    const triggers = subscribeHolder.get(target)

    if (!triggers) {
      return
    }

    triggers.forEach((hook) => {
      hook(...args)
    })
  })
}

export function subscribe <Args extends any[]>(mutation: Mutation<Args>, hook: SubscribeHook<Args>): any
export function subscribe <Args extends any[], Return = any>(action: Action<Args, Return>, hook: SubscribeHook<Args>): any
export function subscribe <Args extends any[], Return = any>(computation: Computation<Args, Return>, hook: SubscribeHook<Args>): any
export function subscribe <Args extends any[], Return = any>(computation: ComputationWritable<Args, Return>, hook: SubscribeHook<Args>): any
export function subscribe <T>(state: State<T>, hook: SubscribeHook<[T]>): any
export function subscribe(
  target,
  hook,
) {
  if (target[MUTATION_IDENTIFIER] || target[ACTION_IDENTIFIER] || target[COMPUTATION_IDENTIFIER]) {
    setSubscribe(target, (...args) => hook(...args))
    return
  }

  watch(computed(() => target), () => hook(), {deep: true})
}
