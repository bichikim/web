import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {UserCreateOrConnectWithoutLikePostsInput} from '../inputs/UserCreateOrConnectWithoutLikePostsInput'
import {UserCreateWithoutLikePostsInput} from '../inputs/UserCreateWithoutLikePostsInput'
import {UserWhereUniqueInput} from '../inputs/UserWhereUniqueInput'

@TypeGraphQL.InputType('UserCreateNestedManyWithoutLikePostsInput', {
  isAbstract: true,
})
export class UserCreateNestedManyWithoutLikePostsInput {
  @TypeGraphQL.Field((_type) => [UserCreateWithoutLikePostsInput], {
    nullable: true,
  })
  create?: UserCreateWithoutLikePostsInput[] | undefined

  @TypeGraphQL.Field((_type) => [UserCreateOrConnectWithoutLikePostsInput], {
    nullable: true,
  })
  connectOrCreate?: UserCreateOrConnectWithoutLikePostsInput[] | undefined

  @TypeGraphQL.Field((_type) => [UserWhereUniqueInput], {
    nullable: true,
  })
  connect?: UserWhereUniqueInput[] | undefined
}
