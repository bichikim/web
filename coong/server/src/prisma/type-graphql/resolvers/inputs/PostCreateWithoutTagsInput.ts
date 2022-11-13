import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {CommentCreateNestedManyWithoutPortInput} from '../inputs/CommentCreateNestedManyWithoutPortInput'
import {PostCreatelikeIDsInput} from '../inputs/PostCreatelikeIDsInput'
import {PostCreatetagIDsInput} from '../inputs/PostCreatetagIDsInput'
import {UserCreateNestedManyWithoutLikePostsInput} from '../inputs/UserCreateNestedManyWithoutLikePostsInput'
import {UserCreateNestedOneWithoutPostsInput} from '../inputs/UserCreateNestedOneWithoutPostsInput'

@TypeGraphQL.InputType('PostCreateWithoutTagsInput', {
  isAbstract: true,
})
export class PostCreateWithoutTagsInput {
  @TypeGraphQL.Field((_type) => String, {
    nullable: true,
  })
  id?: string | undefined

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  title!: string

  @TypeGraphQL.Field((_type) => String, {
    nullable: true,
  })
  message?: string | undefined

  @TypeGraphQL.Field((_type) => UserCreateNestedOneWithoutPostsInput, {
    nullable: false,
  })
  author!: UserCreateNestedOneWithoutPostsInput

  @TypeGraphQL.Field((_type) => UserCreateNestedManyWithoutLikePostsInput, {
    nullable: true,
  })
  likes?: UserCreateNestedManyWithoutLikePostsInput | undefined

  @TypeGraphQL.Field((_type) => PostCreatelikeIDsInput, {
    nullable: true,
  })
  likeIDs?: PostCreatelikeIDsInput | undefined

  @TypeGraphQL.Field((_type) => PostCreatetagIDsInput, {
    nullable: true,
  })
  tagIDs?: PostCreatetagIDsInput | undefined

  @TypeGraphQL.Field((_type) => CommentCreateNestedManyWithoutPortInput, {
    nullable: true,
  })
  comments?: CommentCreateNestedManyWithoutPortInput | undefined
}
