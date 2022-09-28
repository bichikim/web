import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {PostListRelationFilter} from '../inputs/PostListRelationFilter'
import {StringFilter} from '../inputs/StringFilter'
import {StringNullableFilter} from '../inputs/StringNullableFilter'
import {StringNullableListFilter} from '../inputs/StringNullableListFilter'
import {UserListRelationFilter} from '../inputs/UserListRelationFilter'

@TypeGraphQL.InputType('UserWhereInput', {
  isAbstract: true,
})
export class UserWhereInput {
  @TypeGraphQL.Field((_type) => [UserWhereInput], {
    nullable: true,
  })
  AND?: UserWhereInput[] | undefined

  @TypeGraphQL.Field((_type) => [UserWhereInput], {
    nullable: true,
  })
  OR?: UserWhereInput[] | undefined

  @TypeGraphQL.Field((_type) => [UserWhereInput], {
    nullable: true,
  })
  NOT?: UserWhereInput[] | undefined

  @TypeGraphQL.Field((_type) => StringFilter, {
    nullable: true,
  })
  id?: StringFilter | undefined

  @TypeGraphQL.Field((_type) => StringFilter, {
    nullable: true,
  })
  email?: StringFilter | undefined

  @TypeGraphQL.Field((_type) => StringNullableFilter, {
    nullable: true,
  })
  name?: StringNullableFilter | undefined

  @TypeGraphQL.Field((_type) => StringNullableFilter, {
    nullable: true,
  })
  password?: StringNullableFilter | undefined

  @TypeGraphQL.Field((_type) => UserListRelationFilter, {
    nullable: true,
  })
  followers?: UserListRelationFilter | undefined

  @TypeGraphQL.Field((_type) => StringNullableListFilter, {
    nullable: true,
  })
  followerIDs?: StringNullableListFilter | undefined

  @TypeGraphQL.Field((_type) => UserListRelationFilter, {
    nullable: true,
  })
  following?: UserListRelationFilter | undefined

  @TypeGraphQL.Field((_type) => StringNullableListFilter, {
    nullable: true,
  })
  followingIDs?: StringNullableListFilter | undefined

  @TypeGraphQL.Field((_type) => PostListRelationFilter, {
    nullable: true,
  })
  likePosts?: PostListRelationFilter | undefined

  @TypeGraphQL.Field((_type) => StringNullableListFilter, {
    nullable: true,
  })
  likePostIDs?: StringNullableListFilter | undefined

  @TypeGraphQL.Field((_type) => PostListRelationFilter, {
    nullable: true,
  })
  posts?: PostListRelationFilter | undefined

  @TypeGraphQL.Field((_type) => StringNullableListFilter, {
    nullable: true,
  })
  roles?: StringNullableListFilter | undefined
}
