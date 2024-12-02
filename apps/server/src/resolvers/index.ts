/* eslint-disable @typescript-eslint/ban-types */
import {TestResolver} from './test-resolver/TestResolver'
import {AuthResolver} from 'src/resolvers/auth/AuthResolver'
import {NonEmptyArray} from 'type-graphql/build/typings'

export interface Resolver {
  new (): any
}

const resolvers: NonEmptyArray<Function> = [TestResolver, AuthResolver]

export default resolvers
