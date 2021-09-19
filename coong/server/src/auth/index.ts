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

  const {auth: {token}, jwt} = context

  if (!token) {
    return false
  }

  const decodedData = await jwt.verify(token)

  if (!decodedData || typeof decodedData !== 'object') {
    return false
  }

  const {roles: receivedRoles, id} = decodedData

  if (!receivedRoles || !id) {
    return false
  }

  const receivedPermissions = getPermissions(receivedRoles)

  const matchedPermission = getMatchedPermission(receivedPermissions, roles, ['create', 'update', 'read', 'delete'])

  if (!matchedPermission) {
    return false
  }

  if (isSelf(matchedPermission)) {
    context.auth.self = {
      id,
    }
  }

  return true
}

export default auth
