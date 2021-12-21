import {TestResolver} from './TestResolver'
import {AuthResolver} from './Auth/AuthResolver'
import {NonEmptyArray} from 'type-graphql/dist/interfaces/NonEmptyArray'

export interface Resolver {
  new (): any
}

const resolvers: NonEmptyArray<Resolver> = [TestResolver, AuthResolver]

export default resolvers
