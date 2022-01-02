import {BaseListTypeInfo, MaybePromise} from '@keystone-6/core/types'
import {toArray} from '@winter-love/utils'
export type FilterOutput<ListTypeInfo extends BaseListTypeInfo = BaseListTypeInfo> =
  boolean | ListTypeInfo['inputs']['where']

export interface SessionData {
  isAdmin: boolean
  name: string
  roles: string
}

export interface Session {
  data: SessionData
  itemId: string
  listKey: string
}

export interface AuthArgs<Item = undefined> {
  fieldKey?: string
  item?: Item
  operation: string
  session: Session
}

export type AuthChecker<Item = undefined> = (args: AuthArgs<Item>) => MaybePromise<boolean>
export type FilterAuthChecker<Item = undefined> = (args: AuthArgs<Item>) => MaybePromise<FilterOutput>

export const Forbidden = () => {
  return false
}

export const isAdmin = (args: AuthArgs<any>) => {
  const {session} = args
  return Boolean(session.data.isAdmin)
}

export const hasRole = (requiredRoles: string[], and: boolean = true) => (args: AuthArgs) => {
  const {session} = args
  const roles = toArray(session.data.roles)
  if (and) {
    return requiredRoles.every((requiredRole) => {
      return roles.includes(requiredRole)
    })
  }
  return requiredRoles.some((requiredRole) => {
    return roles.includes(requiredRole)
  })
}

export const isTest = (args: AuthArgs<any>) => {
  console.log(args)
  return true
}

export function or<Item = any>(list: FilterAuthChecker<Item>[], filter: true)
export function or<Item = any>(list: AuthChecker<Item>[], filter: false)
export function or<Item = any>(list: AuthChecker<Item>[])
export function or<Item = any>(list: (AuthChecker<Item> | FilterAuthChecker<Item>)[], filter: boolean = false) {
  return async (args: AuthArgs<any>) => {
    const listAsyncIterable = {
      [Symbol.asyncIterator]() {
        return {
          index: 0,
          next() {
            const {index} = this
            if (list.length > index) {
              this.index = index + 1
              return {done: false, value: list[index](args)}
            }
            return {done: true}
          },
        }
      },
    }
    for await (const item of listAsyncIterable) {
      if (item) {
        if (filter) {
          return item
        }
        return Boolean(item)
      }
    }
    return false
  }
}

export function and(list: FilterAuthChecker[], filter: true)
export function and(list: AuthChecker[], filter: false)
export function and(list: (AuthChecker | FilterAuthChecker)[], filter: boolean = false) {
  return async (args: AuthArgs<any>) => {
    const listAsyncIterable = {
      [Symbol.asyncIterator]() {
        return {
          index: 0,
          next() {
            const {index} = this
            if (list.length > index) {
              this.index = index + 1
              return {done: false, value: list[index](args)}
            }
            return {done: true}
          },
        }
      },
    }

    let filterObject: Record<string, any> | null = null

    for await (const item of listAsyncIterable) {
      if (!item) {
        return false
      }
      if (filter && typeof item === 'object') {
        if (!filterObject) {
          filterObject = {}
        }
        Object.assign(filterObject, item)
      }
    }
    if (filterObject) {
      return filterObject
    }
    return true
  }
}
