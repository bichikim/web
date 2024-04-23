import type {Request, Response} from 'express'
import {MaybeFunction, toValue} from '@winter-love/utils'

const hookUid = () => {
  return {[WEAK_ID]: true}
}

export interface ParamsDictionary {
  [key: string]: string
}

export type Controller = () => () => Promise<any> | any

export const WEAK_ID = Symbol('weak_id')

export interface WeakId {
  [WEAK_ID]: boolean
}

const _reqHookMap = new WeakMap<WeakId, Request>()
const _contextHookMap = new WeakMap<Request, Map<string | symbol, any>>()
let _currentId: WeakId = hookUid()

export type ErrorHandler = (error, req: Request, res: Response, next: () => void) => any
let _errorHandler: ErrorHandler = () => null

export const setErrorHandler = (errorHandler: ErrorHandler) => {
  _errorHandler = errorHandler
}

export const useReq = (): Request => {
  return _reqHookMap.get(_currentId)
}

export const TYPE_CONTEXT = Symbol('type-context')
export type ContextLogic = (req: Request, res: Response, next: () => void) => any

export interface Context<T = any> {
  [TYPE_CONTEXT]?: T
  key: symbol | string
  provide: (
    logic: ContextLogic,
  ) => (req: Request, res: Response, next: () => void) => void
}

export const createContext = <T>(defaultValue: T = null): Context<T> => {
  const key = Symbol('context-key')
  return {
    [TYPE_CONTEXT]: defaultValue,
    key,
    provide: (logic) => {
      return provideContext(key, logic)
    },
  }
}

const getKey = (key: symbol | string | Context): string | symbol => {
  return typeof key === 'object' ? key.key : key
}

export const useContext = (key: symbol | string | Context): any => {
  const _key: string | symbol = getKey(key)
  const req = useReq()
  const map = _contextHookMap.get(req)

  if (!map) {
    throw new Error('Context not found')
  }
  return map.get(_key)
}

export const createStaticContextLogic = (value: MaybeFunction<any>) => {
  const _value = toValue(value)
  return () => {
    return _value
  }
}

export const provideContext = (
  key: symbol | string | Context,
  logic: (req, res, next) => any,
) => {
  const _key = getKey(key)
  return async (req, res, next) => {
    const map = _contextHookMap.get(req)
    if (!map) {
      return next()
    }
    const result = await logic(req, res, next)
    map.set(_key, result)
    next()
  }
}

export const withHook = (controller: Controller) => {
  return async (req, res, next) => {
    _reqHookMap.set(_currentId, req)
    _contextHookMap.set(req, new Map())
    try {
      const runner = controller()
      _currentId = hookUid()
      const result = await runner()
      res.send(result)
    } catch (error) {
      _errorHandler(error, req, res, next)
    }
  }
}
