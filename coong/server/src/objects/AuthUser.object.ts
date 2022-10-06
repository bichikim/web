import {User} from 'src/prisma/type-graphql/models/User'
import {Field, ObjectType} from 'type-graphql'

@ObjectType({
  description: 'user and auth token',
})
export class AuthUser extends User {
  @Field({description: 'jwt token'})
  token: string
}
