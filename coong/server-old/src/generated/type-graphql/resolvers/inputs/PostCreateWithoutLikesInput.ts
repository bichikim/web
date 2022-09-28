import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {PostCreatelikeIDsInput} from '../inputs/PostCreatelikeIDsInput'
import {UserCreateNestedOneWithoutPostsInput} from '../inputs/UserCreateNestedOneWithoutPostsInput'

@TypeGraphQL.InputType('PostCreateWithoutLikesInput', {
  isAbstract: true,
})
export class PostCreateWithoutLikesInput {
  @TypeGraphQL.Field((_type) => String, {
    nullable: true,
  })
  id?: string | undefined

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  title!: string

  @TypeGraphQL.Field((_type) => UserCreateNestedOneWithoutPostsInput, {
    nullable: true,
  })
  author?: UserCreateNestedOneWithoutPostsInput | undefined

  @TypeGraphQL.Field((_type) => PostCreatelikeIDsInput, {
    nullable: true,
  })
  likeIDs?: PostCreatelikeIDsInput | undefined
}
