import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {NullableStringFieldUpdateOperationsInput} from '../inputs/NullableStringFieldUpdateOperationsInput'
import {PostUpdateManyWithoutAuthorNestedInput} from '../inputs/PostUpdateManyWithoutAuthorNestedInput'
import {PostUpdateManyWithoutLikesNestedInput} from '../inputs/PostUpdateManyWithoutLikesNestedInput'
import {StringFieldUpdateOperationsInput} from '../inputs/StringFieldUpdateOperationsInput'
import {UserUpdateManyWithoutFollowersNestedInput} from '../inputs/UserUpdateManyWithoutFollowersNestedInput'
import {UserUpdateManyWithoutFollowingNestedInput} from '../inputs/UserUpdateManyWithoutFollowingNestedInput'
import {UserUpdatefollowerIDsInput} from '../inputs/UserUpdatefollowerIDsInput'
import {UserUpdatefollowingIDsInput} from '../inputs/UserUpdatefollowingIDsInput'
import {UserUpdatelikePostIDsInput} from '../inputs/UserUpdatelikePostIDsInput'
import {UserUpdaterolesInput} from '../inputs/UserUpdaterolesInput'

@TypeGraphQL.InputType('UserUpdateWithoutCommentsInput', {
  isAbstract: true,
})
export class UserUpdateWithoutCommentsInput {
  @TypeGraphQL.Field((_type) => StringFieldUpdateOperationsInput, {
    nullable: true,
  })
  email?: StringFieldUpdateOperationsInput | undefined

  @TypeGraphQL.Field((_type) => NullableStringFieldUpdateOperationsInput, {
    nullable: true,
  })
  name?: NullableStringFieldUpdateOperationsInput | undefined

  @TypeGraphQL.Field((_type) => NullableStringFieldUpdateOperationsInput, {
    nullable: true,
  })
  password?: NullableStringFieldUpdateOperationsInput | undefined

  @TypeGraphQL.Field((_type) => UserUpdateManyWithoutFollowingNestedInput, {
    nullable: true,
  })
  followers?: UserUpdateManyWithoutFollowingNestedInput | undefined

  @TypeGraphQL.Field((_type) => UserUpdatefollowerIDsInput, {
    nullable: true,
  })
  followerIDs?: UserUpdatefollowerIDsInput | undefined

  @TypeGraphQL.Field((_type) => UserUpdateManyWithoutFollowersNestedInput, {
    nullable: true,
  })
  following?: UserUpdateManyWithoutFollowersNestedInput | undefined

  @TypeGraphQL.Field((_type) => UserUpdatefollowingIDsInput, {
    nullable: true,
  })
  followingIDs?: UserUpdatefollowingIDsInput | undefined

  @TypeGraphQL.Field((_type) => PostUpdateManyWithoutLikesNestedInput, {
    nullable: true,
  })
  likePosts?: PostUpdateManyWithoutLikesNestedInput | undefined

  @TypeGraphQL.Field((_type) => UserUpdatelikePostIDsInput, {
    nullable: true,
  })
  likePostIDs?: UserUpdatelikePostIDsInput | undefined

  @TypeGraphQL.Field((_type) => PostUpdateManyWithoutAuthorNestedInput, {
    nullable: true,
  })
  posts?: PostUpdateManyWithoutAuthorNestedInput | undefined

  @TypeGraphQL.Field((_type) => UserUpdaterolesInput, {
    nullable: true,
  })
  roles?: UserUpdaterolesInput | undefined
}
