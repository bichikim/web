import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'

@TypeGraphQL.InputType('UserCreatelikePostIDsInput', {
  isAbstract: true,
})
export class UserCreatelikePostIDsInput {
  @TypeGraphQL.Field((_type) => [String], {
    nullable: false,
  })
  set!: string[]
}
