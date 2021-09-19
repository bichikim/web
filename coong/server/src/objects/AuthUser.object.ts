import {Field, ObjectType} from 'type-graphql'
import {User} from 'src/generated/type-graphql/models/User'

@ObjectType({
  description: 'user and auth token',
})
export class AuthUser extends User {
  @Field({description: 'jwt token'})
  token: string
}
