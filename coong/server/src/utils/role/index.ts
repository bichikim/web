import {get} from 'lodash'
import {ResolverData} from 'type-graphql'

export type DefaultAction = 'allow' | 'disallow'

export interface GlobalRole {
  disallow?: string[]
}

export interface TargetRole extends GlobalRole {
  /**
   * "xxx.self" 는 반드시 compareId 이 있어야 한다
   * a "xxx.self" role without this property will disallow its permission
   */
  compareId?: string
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
  input?: GlobalRole | boolean
  /**
   * @default false
   */
  output?: GlobalRole | boolean
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

const pickHeaderData = (data: ResolverData, header: string) => {
  switch (header) {
    case 'args':
      return toArray(data.args.data)
    case 'root':
      return toArray(data.root)
    default:
      return []
  }
}

const pickDataFromArray = (data: any[], track: string | string[]): any[] => {
  return data.map((data) => {
    if (typeof data === 'object') {
      return get(data, track)
    }
    return null
  })
}

const pickData = (data: ResolverData, map: string) => {
  const [header, ...track] = map.split('.')
  const headerData = pickHeaderData(data, header)
  return pickDataFromArray(headerData, track)
}

const checkDisAllow = (
  data: ResolverData,
  role: GlobalRole | boolean | undefined,
  defaultRole: boolean = false,
): boolean => {
  if (typeof role === 'boolean') {
    return role
  }
  if (typeof role === 'undefined' || !role.disallow || role.disallow.length === 0) {
    return defaultRole
  }

  return !role.disallow.some((value: string) => {
    return pickData(data, value).some((value: string) => Boolean(value))
  })
}

export const createAuthInputGate = <ContextType = Record<string, any>>(
  roles: GateRoles,
) => {

  const allowRoles = roles.roles ? Object.keys(roles.roles) : undefined

  return (data: ResolverData<ContextType>, userRoles: string[]) => {
    const isPass = checkDisAllow(data, roles.input)

    if (!isPass || !allowRoles) {
      return false
    }

    const matchedRole = allowRoles.find((allowRole) => userRoles.includes(allowRole))

    if (!matchedRole) {
      return false
    }

    const matchedRoleValue = roles.roles?.[matchedRole]

    if (typeof matchedRoleValue === 'boolean') {
      return matchedRoleValue
    }

    return checkDisAllow(data, matchedRoleValue?.input)
  }
}

