import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {TagUpdateWithoutPostsInput} from '../inputs/TagUpdateWithoutPostsInput'
import {TagWhereUniqueInput} from '../inputs/TagWhereUniqueInput'

@TypeGraphQL.InputType('TagUpdateWithWhereUniqueWithoutPostsInput', {
  isAbstract: true,
})
export class TagUpdateWithWhereUniqueWithoutPostsInput {
  @TypeGraphQL.Field((_type) => TagWhereUniqueInput, {
    nullable: false,
  })
  where!: TagWhereUniqueInput

  @TypeGraphQL.Field((_type) => TagUpdateWithoutPostsInput, {
    nullable: false,
  })
  data!: TagUpdateWithoutPostsInput
}
