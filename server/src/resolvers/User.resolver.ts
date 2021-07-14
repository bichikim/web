import {User} from 'src/objects'
import {Query, Resolver} from 'type-graphql'

@Resolver()
export class UserResolver {
  @Query(() => User)
  user() {
    return {
      email: 'foo@foo.net',
      id: '1',
      name: 'foo',
    }
  }
}
