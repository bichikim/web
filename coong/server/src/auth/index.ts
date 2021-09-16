import {AuthChecker} from 'type-graphql'
import {Context} from 'src/context'

const getAllRoles = (roles: string[]) => {
  
}

// todo needs to create auth logic
export const auth: AuthChecker<Context> = ({context}) => {
  context.auth.checkAuthorId = 'test'
  return true
}

export default auth
