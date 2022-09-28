import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {PostUpdateWithoutLikesInput} from '../inputs/PostUpdateWithoutLikesInput'
import {PostWhereUniqueInput} from '../inputs/PostWhereUniqueInput'

@TypeGraphQL.InputType('PostUpdateWithWhereUniqueWithoutLikesInput', {
  isAbstract: true,
})
export class PostUpdateWithWhereUniqueWithoutLikesInput {
  @TypeGraphQL.Field((_type) => PostWhereUniqueInput, {
    nullable: false,
  })
  where!: PostWhereUniqueInput

  @TypeGraphQL.Field((_type) => PostUpdateWithoutLikesInput, {
    nullable: false,
  })
  data!: PostUpdateWithoutLikesInput
}
