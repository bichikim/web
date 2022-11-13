import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {TagCreateWithoutPostsInput} from '../inputs/TagCreateWithoutPostsInput'
import {TagUpdateWithoutPostsInput} from '../inputs/TagUpdateWithoutPostsInput'
import {TagWhereUniqueInput} from '../inputs/TagWhereUniqueInput'

@TypeGraphQL.InputType('TagUpsertWithWhereUniqueWithoutPostsInput', {
  isAbstract: true,
})
export class TagUpsertWithWhereUniqueWithoutPostsInput {
  @TypeGraphQL.Field((_type) => TagWhereUniqueInput, {
    nullable: false,
  })
  where!: TagWhereUniqueInput

  @TypeGraphQL.Field((_type) => TagUpdateWithoutPostsInput, {
    nullable: false,
  })
  update!: TagUpdateWithoutPostsInput

  @TypeGraphQL.Field((_type) => TagCreateWithoutPostsInput, {
    nullable: false,
  })
  create!: TagCreateWithoutPostsInput
}
