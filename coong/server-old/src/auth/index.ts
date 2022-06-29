import {AuthChecker} from 'type-graphql'
import {Context} from 'src/context'
import {createGetPermissions, createPermissions, getMatchedPermission} from './utils'
import {permissions as rawPermissions, roles} from './roles'

const getPermissions = createGetPermissions({
  roles,
})

export const permissions = createPermissions(rawPermissions)

const isSelf = (permission: string) => Object.is(permission.split('.')[1], 'self')

export const auth: AuthChecker<Context> = async (resolverData, roles) => {
  const {context} = resolverData

  if (roles.length === 0) {
    return false
  }

  const {
    auth: {token},
    jwt,
  } = context

  if (!token) {
    return false
  }

  const decodedData = await jwt.verify(token)

  if (!decodedData || typeof decodedData !== 'object') {
    return false
  }

  const {roles: receivedRoles, id, email} = decodedData

  if (!receivedRoles || !id || !email) {
    return false
  }

  const receivedPermissions = getPermissions(receivedRoles)

  const matchedPermission = getMatchedPermission(receivedPermissions, roles)

  if (!matchedPermission) {
    return false
  }

  context.auth.self = {
    email,
    id,
  }

  context.auth.isSelf = isSelf(matchedPermission)

  return true
}

export default auth
