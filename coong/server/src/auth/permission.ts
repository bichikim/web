import {cleanObject, MaybePromise, toArray} from '@winter-love/utils'
import {ResolverData} from 'type-graphql'
import {Context, UserData} from 'src/context'
import {isEmpty, isMatch} from 'lodash'

export const roles = ['admin', 'user']

export type ActionKey = 'create' | 'delete' | 'read' | 'self' | 'update' | 'all'

export type SelfIdGetter<Context extends object> = (
  resolverData: ResolverData<Context>,
) => MaybePromise<Record<string, any> | Record<string, any>[]>

export type Role = (
  userData: UserData,
  resolverData: ResolverData<Context>,
) => Promise<boolean> | boolean

const isSafeEmptyMatch = (original: Record<string, any>, source: Record<string, any>) => {
  if (isEmpty(source)) {
    return false
  }
  return isMatch(original, source)
}

export type Allow = (resolverData: ResolverData<Context>) => Promise<boolean> | boolean

export type ValidateResolver = (resolverData: ResolverData<Context>) => boolean

export const forbidden =
  (resolver: ValidateResolver): Allow =>
  (resolverData) => {
    return !resolver(resolverData)
  }

export const hasSome = (record: Record<string, any> | Record<string, any>[]) => {
  if (Array.isArray(record)) {
    return record.some((record) => hasSome(record))
  }
  return Object.entries(record).some(([, value]) => Boolean(value))
}

export const hasEvery = (record: Record<string, any> | Record<string, any>[]) => {
  if (Array.isArray(record)) {
    return record.every((record) => hasEvery(record))
  }
  return Object.entries(record).every(([, value]) => Boolean(value))
}

export const allow =
  (resolver: ValidateResolver): Allow =>
  (resolverData) => {
    return resolver(resolverData)
  }

export const user = (selfIdGetter: SelfIdGetter<Context>, allow?: Allow): Role => {
  return async (
    userData: UserData,
    resolverData: ResolverData<Context>,
  ): Promise<boolean> => {
    if (allow && !(await allow(resolverData))) {
      return false
    }
    const ids = await selfIdGetter(resolverData)

    if (Array.isArray(ids)) {
      return ids.every((id) => isSafeEmptyMatch(userData, cleanObject(id)))
    }

    return isSafeEmptyMatch(userData, cleanObject(ids))
  }
}

export type Validator<T = any> = (value: T) => boolean

export type ValidateMode = 'or' | 'and'

export const validate = (
  list: (string | Validator)[],
  value: any,
  mode: ValidateMode = 'and',
) => {
  const allAround = (arg: string | Validator) => {
    if (typeof arg === 'function') {
      return arg(value)
    }
    return arg === value
  }

  if (mode === 'and') {
    return list.every((arg) => allAround(arg))
  }

  return list.some((arg) => allAround(arg))
}

export const createValidate = <T>(
  mode: ValidateMode = 'and',
  ...args: (string | Validator<T>)[]
): Validator<T> => {
  return (value: T) => {
    return validate(args, value, mode)
  }
}

export const or = (...args: (string | Validator)[]): Validator => {
  return createValidate('or', ...args)
}

export const and = (...args: (string | Validator)[]): Validator => {
  return createValidate('and', ...args)
}

export const role = (
  authRoles: (string | Validator)[] | string | Validator,
  allow?: Allow,
): Role => {
  const _authRoles = toArray(authRoles)
  return async (
    userData: UserData,
    resolverData: ResolverData<Context>,
  ): Promise<boolean> => {
    if (allow && !(await allow(resolverData))) {
      return false
    }
    const {roles} = userData

    const _roles = toArray(roles)

    return _roles.some((role) => {
      return validate(_authRoles, role, 'or')
    })
  }
}
