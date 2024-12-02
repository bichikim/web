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
  (pairs: [any, any][]) => pairs.filter(([_, value]) => Boolean(value)),
  (pairs: [any, any][]) => pairs.map(([key]) => key),
])

export const getRoles = (roles: string[], permissionsKeys: string[]) =>
  // eslint-disable-next-line unicorn/no-array-reduce
  roles.reduce(
    (result, role) => {
      if (permissionsKeys.includes(role)) {
        result.roles.push(role)
      } else {
        result.permissions.push(role)
      }
      return result
    },
    {
      permissions: [] as string[],
      roles: [] as string[],
    },
  )

export const getPermissionFromRoles = flow([
  (roles: string[], roleMap: FlatRoles) => pick(roleMap, roles),
  curryRight(filter)(Boolean),
  flatten,
])

export const flattenRoles = flow(
  (roles: Roles) => Object.entries(roles),
  (list) => list.map(([key, value]) => [key, getTrueKeys(value)]),
  (entries): FlatRoles => Object.fromEntries(entries),
)

export const createGetPermissions =
  <R extends Roles>(options: CreateGetRolesOptions<R>) =>
  (receivedData: string[]): string[] => {
    const {roles} = options

    const flatRoles = flattenRoles(roles)

    const rolesKeys = getTrueKeys(roles)

    const {permissions: receivedPermissions, roles: receivedRoles} = getRoles(
      receivedData,
      rolesKeys,
    )

    return [...getPermissionFromRoles(receivedRoles, flatRoles), ...receivedPermissions]
  }
export type GeneratedRole<P extends string, A extends string> = Record<
  P,
  Record<A, string>
>
export const createPermissions = <P extends string, A extends string>(
  permissions: Permissions<P, A>,
): GeneratedRole<P, A> => {
  // eslint-disable-next-line unicorn/no-array-reduce
  return Object.keys(permissions).reduce(
    (result, permissionKey) => {
      const value = permissions[permissionKey]
      // eslint-disable-next-line unicorn/no-array-reduce
      result[permissionKey] = Object.keys(value).reduce(
        (result, actionKey) => {
          result[actionKey] = `${permissionKey}.${actionKey}`
          return result
        },
        {} as Record<string, any>,
      )
      return result
    },
    {} as GeneratedRole<P, A>,
  )
}

export const transformAllPermission = (permissions: string[], allActions: string[]) => {
  const complexPermissions = permissions.map((permission) => {
    const [name, postFix] = permission.split('.')
    if (!postFix || Object.is(postFix, 'all')) {
      return allActions.map((action) => `${name}.${action}`)
    }
    return permission
  })

  return flatten(complexPermissions)
}

export const getMatchedPermissionWithAll = (
  receivedPermissions: string[],
  roles: string[],
  allActions: string[],
) => {
  const verbosePermission = transformAllPermission(receivedPermissions, allActions)

  return roles.find((role) => verbosePermission.includes(role))
}

export const getMatchedPermission = (receivedPermissions: string[], roles: string[]) => {
  return roles.find((role) => receivedPermissions.includes(role))
}
