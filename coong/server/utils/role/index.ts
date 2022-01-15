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

export interface AuthArgs<ListTypeInfo extends BaseListTypeInfo = any> {
  fieldKey?: string
  inputData?: any
  item?: ListTypeInfo['item']
  operation: string | 'delete'
  session: Session
}

export type AuthChecker<ListTypeInfo extends BaseListTypeInfo> =
  (args: AuthArgs<ListTypeInfo>) => MaybePromise<boolean>
export type FilterAuthChecker<ListTypeInfo extends BaseListTypeInfo> =
  (args: AuthArgs<ListTypeInfo>) => MaybePromise<FilterOutput>

export const Forbidden = () => {
  return false
}

export const isAdmin = (args: AuthArgs<any>) => {
  const {session} = args
  return Boolean(session?.data?.isAdmin)
}

export const isUser = (args: AuthArgs<any>) => {
  const {session} = args
  return Boolean(session?.itemId)
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

export function or<ListTypeInfo extends BaseListTypeInfo = any>(list: FilterAuthChecker<ListTypeInfo>[], filter: true)
export function or<ListTypeInfo extends BaseListTypeInfo = any>(list: AuthChecker<ListTypeInfo>[], filter: false)
export function or<ListTypeInfo extends BaseListTypeInfo = any>(list: AuthChecker<ListTypeInfo>[])
export function or<ListTypeInfo extends BaseListTypeInfo = any>(
  list: (AuthChecker<ListTypeInfo> | FilterAuthChecker<ListTypeInfo>)[],
  filter: boolean = false,
) {
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

export function and<ListTypeInfo extends BaseListTypeInfo = any>(list: FilterAuthChecker<ListTypeInfo>[], filter: true)
export function and<ListTypeInfo extends BaseListTypeInfo = any>(list: AuthChecker<ListTypeInfo>[], filter: false)
export function and<ListTypeInfo extends BaseListTypeInfo = any>(
  list: (AuthChecker<ListTypeInfo> | FilterAuthChecker<ListTypeInfo>)[],
  filter: boolean = false,
) {
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
