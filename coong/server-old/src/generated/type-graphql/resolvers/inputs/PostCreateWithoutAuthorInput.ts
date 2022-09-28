import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {PostCreatelikeIDsInput} from '../inputs/PostCreatelikeIDsInput'
import {UserCreateNestedManyWithoutLikePostsInput} from '../inputs/UserCreateNestedManyWithoutLikePostsInput'

@TypeGraphQL.InputType('PostCreateWithoutAuthorInput', {
  isAbstract: true,
})
export class PostCreateWithoutAuthorInput {
  @TypeGraphQL.Field((_type) => String, {
    nullable: true,
  })
  id?: string | undefined

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  title!: string

  @TypeGraphQL.Field((_type) => UserCreateNestedManyWithoutLikePostsInput, {
    nullable: true,
  })
  likes?: UserCreateNestedManyWithoutLikePostsInput | undefined

  @TypeGraphQL.Field((_type) => PostCreatelikeIDsInput, {
    nullable: true,
  })
  likeIDs?: PostCreatelikeIDsInput | undefined
}
