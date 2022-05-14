import {BaseListTypeInfo} from '@keystone-6/core/types'
import {AuthArgs, AuthChecker, FilterAuthChecker} from './types'

async function *asyncGenerator<ListTypeInfo extends BaseListTypeInfo = any>(
  list: (AuthChecker<ListTypeInfo> | FilterAuthChecker<ListTypeInfo>)[],
  args: AuthArgs,
) {
  let index = 0
  while (list.length > index) {
    // eslint-disable-next-line no-plusplus
    yield list[index++](args)
  }
}

export function or<ListTypeInfo extends BaseListTypeInfo = any>(list: FilterAuthChecker<ListTypeInfo>[], filter: true)
export function or<ListTypeInfo extends BaseListTypeInfo = any>(list: AuthChecker<ListTypeInfo>[], filter: false)
export function or<ListTypeInfo extends BaseListTypeInfo = any>(list: AuthChecker<ListTypeInfo>[])
export function or<ListTypeInfo extends BaseListTypeInfo = any>(
  list: (AuthChecker<ListTypeInfo> | FilterAuthChecker<ListTypeInfo>)[],
  filter: boolean = false,
) {

  return async (args: AuthArgs) => {
    for await (const item of asyncGenerator(list, args)) {
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
export function and<ListTypeInfo extends BaseListTypeInfo = any>(list: AuthChecker<ListTypeInfo>[])
export function and<ListTypeInfo extends BaseListTypeInfo = any>(
  list: (AuthChecker<ListTypeInfo> | FilterAuthChecker<ListTypeInfo>)[],
  filter: boolean = false,
) {
  return async (args: AuthArgs) => {
    const filterObject: Record<string, any> = {}

    for await (const item of asyncGenerator(list, args)) {
      if (!item) {
        return false
      }
      if (filter && typeof item === 'object') {
        Object.assign(filterObject, item)
      }
    }
    if (Object.keys(filterObject).length > 0) {
      return filterObject
    }
    return true
  }
}
