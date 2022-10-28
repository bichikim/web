/* eslint-disable @typescript-eslint/ban-types */
import {TestResolver} from './test-resolver/TestResolver'
import {AuthResolver} from './Auth/AuthResolver'
import {NonEmptyArray} from 'type-graphql/dist/interfaces/NonEmptyArray'

export interface Resolver {
  new (): any
}

const resolvers: NonEmptyArray<Function> = [TestResolver, AuthResolver]

export default resolvers