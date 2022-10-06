import {Test} from 'src/objects'
import {Args, Mutation, Query, Resolver} from 'type-graphql'
import {UpdateTestArgs} from './UpdateTestArgs'

@Resolver(() => Test)
export class TestResolver {
  private _test: Test = {
    id: '1',
    name: 'foo',
  }

  @Query(() => Test)
  test(): Test {
    return this._test
  }

  @Mutation(() => Test)
  updateTest(@Args() args: UpdateTestArgs): Test {
    const {name} = args ?? {}

    this._test.name = name

    return {...this._test}
  }
}
