import {User} from 'src/objects'
import {Resolver, Query} from 'type-graphql'

@Resolver()
export class UserResolver {
  @Query(() => User)
  user() {
    return {
      id: '1',
      name: 'foo',
      email: 'foo@foo.net',
    }
  }
}
