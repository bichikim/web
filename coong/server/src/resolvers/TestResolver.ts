import {Test} from 'src/objects'
import {Query, Resolver} from 'type-graphql'

@Resolver(() => Test)
export class TestResolver {
  @Query(() => Test)
  test(): Test {
    return {
      id: '1',
      name: 'foo',
    }
  }
}
