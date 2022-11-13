import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {PostCreateOrConnectWithoutLikesInput} from '../inputs/PostCreateOrConnectWithoutLikesInput'
import {PostCreateWithoutLikesInput} from '../inputs/PostCreateWithoutLikesInput'
import {PostWhereUniqueInput} from '../inputs/PostWhereUniqueInput'

@TypeGraphQL.InputType('PostCreateNestedManyWithoutLikesInput', {
  isAbstract: true,
})
export class PostCreateNestedManyWithoutLikesInput {
  @TypeGraphQL.Field((_type) => [PostCreateWithoutLikesInput], {
    nullable: true,
  })
  create?: PostCreateWithoutLikesInput[] | undefined

  @TypeGraphQL.Field((_type) => [PostCreateOrConnectWithoutLikesInput], {
    nullable: true,
  })
  connectOrCreate?: PostCreateOrConnectWithoutLikesInput[] | undefined

  @TypeGraphQL.Field((_type) => [PostWhereUniqueInput], {
    nullable: true,
  })
  connect?: PostWhereUniqueInput[] | undefined
}
