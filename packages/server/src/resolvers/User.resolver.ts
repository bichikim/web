import {User} from '@/objects'
import {Resolver, Query} from 'type-graphql'

@Resolver()
export class UserResolver {
  @Query(() => User)
  async user() {
    return {
      id: '1',
      name: 'foo',
      email: 'foo@foo.net',
    }
  }
}
