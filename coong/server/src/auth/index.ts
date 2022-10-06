import {Context, UserData} from 'src/context'
import {AuthChecker} from 'type-graphql'
import {Role} from './permission'

export * from './permission'

export const auth: AuthChecker<Context, Role> = async (resolverData, roles) => {
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

  const user: UserData = {
    email,
    id,
    roles: receivedRoles,
  }

  return Promise.all(roles.map((role) => role(user, resolverData))).then((result) => {
    return result.some(Boolean)
  })
}

export default auth
