import {get} from 'lodash'
import {ResolverData} from 'type-graphql'

export type DefaultAction = 'allow' | 'disallow'

export interface TargetRole {
  /**
   * "xxx.self" 는 반드시 compareId 이 있어야 한다
   * a "xxx.self" role without this property will disallow its permission
   */
  compareId?: string
  disallow?: string[]
}

export interface GateRole {
  /**
   * @default true
   */
  input?: TargetRole | boolean
  /**
   * @default true
   */
  output?: TargetRole | boolean
}

export interface GateRoles {
  /**
   * @default false
   */
  input?: TargetRole | boolean
  /**
   * @default false
   */
  output?: TargetRole | boolean
  /**
   * 특정 역할에 대한 행동
   * true = allow
   * false = disallow
   */
  roles?: Record<string, GateRole | boolean>
}

const toArray = (value: any | any[]): any[] => {
  if (Array.isArray(value)) {
    return value
  }
  return [value]
}

const pickHeaderData = <ContextType>(data: ResolverData<ContextType>, header: string) => {
  switch (header) {
    case 'args': {
      return toArray(data.args.data)
    }
    case 'root': {
      return toArray(data.root)
    }
    default: {
      return []
    }
  }
}

const pickDataFromArray = (data: any[], track: (string | number) | (string | number)[]): any[] => {
  return data.map((data) => {
    if (typeof data === 'object') {
      return get(data, track)
    }
    return null
  })
}

const pickData = <ContextType>(data: ResolverData<ContextType>, map: string) => {
  const [header, ...track] = map.split('.')
  const headerData = pickHeaderData(data, header)
  return pickDataFromArray(headerData, track)
}

const checkRole = <ContextType>(
  data: ResolverData<ContextType>,
  id: string | number,
  role: TargetRole | boolean | undefined,
  defaultRole: boolean = false,
): boolean => {
  if (typeof role === 'boolean') {
    return role
  }

  if (role === undefined) {
    return defaultRole
  }

  const {compareId, disallow} = role

  if (compareId && pickData(data, compareId).every((_id) => id === _id)) {
    return false
  }

  if (!disallow || disallow.length === 0) {
    return defaultRole
  }

  return !disallow.some((value: string) => {
    return pickData(data, value).some(Boolean)
  })
}

export const createAuthInputGate = <ContextType = Record<string, any>>(roles: GateRoles) => {
  const allowRoles = roles.roles ? Object.keys(roles.roles) : undefined

  return (data: ResolverData<ContextType>, userRoles: string[], id: string | number) => {
    const isPass = checkRole(data, id, roles.input)

    if (!isPass || !allowRoles) {
      return false
    }

    return allowRoles.some((allowRole) => {
      const hasRole = userRoles.includes(allowRole)

      if (!hasRole) {
        return false
      }

      const matchedRoleValue = roles.roles?.[allowRole]

      if (typeof matchedRoleValue === 'boolean') {
        return matchedRoleValue
      }

      return checkRole(data, id, matchedRoleValue?.input)
    })
  }
}
