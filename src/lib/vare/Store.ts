import {Ref, UnwrapRef, reactive} from '@vue/reactivity'
import {_triggerDevToolAction, _triggerDevToolMutation} from './devtool'
import {App} from 'vue'

export type AnyFunc = (...args: any[]) => any
export type SubscribeFunc = (name: string, args: any[], originalAction: AnyFunc, wrappedAction: AnyFunc) => any
export type ActionFunc = (...args: any[]) => PromiseLike<any> | any
export type AnyObject = Record<string | number | symbol, any>
export type State<T> = T extends Ref ? T : UnwrapRef<T>

function _callAllSubscribes(subscribes: Map<SubscribeFunc, boolean>, name: string, args: any[], original: AnyFunc, wrapper: AnyFunc) {
  subscribes.forEach((_, subscribe) => {
    subscribe(name, args, original, wrapper)
  })
}

export interface RegisterOptions {
  /**
   * @default 'unknown'
   */
  name?: string
  /**
   * @default true
   */
  save?: boolean
}

export class Store<T extends AnyObject> {
  private _state: State<T>
  private readonly _subscribes: Map<SubscribeFunc, boolean> = new Map()
  private readonly _actionSubscribes: Map<SubscribeFunc, boolean> = new Map()
  private readonly _name: string
  private readonly _initState: T

  constructor(state: T, options: RegisterOptions = {}) {
    const {save = true, name} = options
    this._initState = {...state}
    this._state = reactive(this._initState)
    this._name = typeof name === 'undefined' ? 'unknown' : name
    if (save) {
      setStore(this, name)
    }
  }

  mutations<T extends Record<string, AnyFunc>>(mutationTree: T): T {
    return (
        Object.keys(mutationTree).reduce((tree: Record<string, any>, key) => {
          const value = mutationTree[key]
          tree[key] = this.mutation(value, key)
          return tree
        }, {})
    ) as any
  }

  /**
   * @param mutation
   * @param name mutation name useful for debug
   */
  mutation<T extends AnyFunc>(mutation: T, name = 'unknown'): T {
    const func = (...args: any[]) => {
      _callAllSubscribes(this._subscribes, name, args, mutation, func)
      const result = mutation(...args)
      _triggerDevToolMutation(this._name, name, args, this._state)
      return result
    }
    return func as any
  }

  actions<T extends Record<string, ActionFunc>>(actionTree: T): T {
    return (
      Object.keys(actionTree).reduce((tree: Record<string, any>, key) => {
        const value = actionTree[key]
        tree[key] = this.action(value, key)
        return tree
      }, {})
    ) as any
  }

  action<T extends ActionFunc>(action: T, name: string = 'unknown'): T {
    const func = async (...args: any[]) => {
      _callAllSubscribes(this._actionSubscribes, name, args, action, func)
      const result = await action(...args)
      _triggerDevToolAction(this._name, name, args, this._state)
      return result
    }

    return func as any
  }

  get state(): State<T> {
    return this._state
  }

  clear(type: 'state' | 'subscribe' | 'subscribeAction'): void {
    switch (type) {
      case 'state':
        this._state = reactive(this._initState)
        return
      case 'subscribe':
        this._subscribes.clear()
        return
      case 'subscribeAction':
        this._actionSubscribes.clear()
    }
  }

  subscribe(func: SubscribeFunc): void {
    this._subscribes.set(func, true)
  }

  subscribeAction(func: SubscribeFunc): void {
    this._actionSubscribes.set(func, true)
  }

  unsubscribeAction(func: SubscribeFunc): void {
    this._actionSubscribes.delete(func)
  }

  unsubscribe(func: SubscribeFunc): void {
    this._subscribes.delete(func)
  }
}

export const createStore = <T>(state: T, options?: RegisterOptions): Store<T> => (new Store<T>(state, options))

/**
 * Protection from garbage collection
 */
const _storeTree: Map<Store<any> | string, Store<any>> = new Map()

const setStore = <T>(storeInstance: Store<T>, name?: string) => {
  if (name) {
    _storeTree.set(name, storeInstance)
    return
  }
  _storeTree.set(storeInstance, storeInstance)
}

export class Vare {
  install(app: App): any {
    app.config.globalProperties.$vare = _storeTree
  }
}

export const createVare = (): Vare => new Vare()
