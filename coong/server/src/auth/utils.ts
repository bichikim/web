import {curryRight, filter, flatten, flow, pick, toPairs} from 'lodash'
import {Permissions} from 'src/auth/roles'

export interface Roles {
  [key: string]: {
    [Key: string]: boolean
  }
}

export interface FlatRoles {
  [key: string]: string[]
}

export interface CreateGetRolesOptions<R extends Roles> {
  roles: R
}

export const getTrueKeys = flow([
  (target: Record<string, any>) => toPairs(target),
  (pairs) => pairs.filter(([_, value]) => Boolean(value)),
  (pairs) => pairs.map(([key]) => key),
])

export const getRoles = (roles: string[], permissionsKeys: string[]) =>
  roles.reduce((result, role) => {
    if (permissionsKeys.includes(role)) {
      result.roles.push(role)
    } else {
      result.permissions.push(role)
    }
    return result
  }, {
    permissions: [] as string[],
    roles: [] as string[],
  })

export const getPermissionFromRoles = flow([
  (roles: string[], roleMap: FlatRoles) => pick(roleMap, roles),
  curryRight(filter)((role) => Boolean(role)),
  flatten,
])

export const flattenRoles = (roles: Roles): FlatRoles =>
  Object.keys(roles).reduce<FlatRoles>((result, key) => {
    const value = roles[key]
    result[key] = getTrueKeys(value)
    return result
  }, {})

export const createGetPermissions = <R extends Roles>(
  options: CreateGetRolesOptions<R>,
) => (receivedData: string[]): string[] => {
    const {roles} = options

    const flatRoles = flattenRoles(roles)

    const rolesKeys = getTrueKeys(roles)

    const {permissions: receivedPermissions, roles: receivedRoles} = getRoles(receivedData, rolesKeys)

    return [...getPermissionFromRoles(receivedRoles, flatRoles), ...receivedPermissions]
  }
export type GeneratedRole<P extends string, A extends string> = Record<P, Record<A, string>>
export const createPermissions = <P extends string, A extends string>(
  permissions: Permissions<P, A>,
): GeneratedRole<P, A> => {
  return Object.keys(permissions).reduce((result, permissionKey) => {
    const value = permissions[permissionKey]
    result[permissionKey] = Object.keys(value).reduce((result, actionKey) => {
      result[actionKey] = `${permissionKey}.${actionKey}`
      return result
    }, {} as Record<string, any>)
    return result
  }, {} as GeneratedRole<P, A>)
}

export const transformAllPermission = (permissions: string[], allActions: string[]) => {
  return permissions.reduce((result, permission) => {
    const [name, postFix] = permission.split('.')
    if (!postFix || Object.is(postFix, 'all')) {
      result.push(...allActions.map((action) => `${name}.${action}`))
    } else {
      result.push(permission)
    }
    return result
  }, [] as string[])
}

export const getMatchedPermission = (receivedPermissions: string[], roles: string[], allActions: string[]) => {
  const verbosePermission = transformAllPermission(receivedPermissions, allActions)

  return roles.find((role) => verbosePermission.includes(role))
}
