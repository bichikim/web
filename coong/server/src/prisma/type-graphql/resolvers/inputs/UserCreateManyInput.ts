import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {UserCreatefollowerIDsInput} from '../inputs/UserCreatefollowerIDsInput'
import {UserCreatefollowingIDsInput} from '../inputs/UserCreatefollowingIDsInput'
import {UserCreatelikePostIDsInput} from '../inputs/UserCreatelikePostIDsInput'
import {UserCreaterolesInput} from '../inputs/UserCreaterolesInput'

@TypeGraphQL.InputType('UserCreateManyInput', {
  isAbstract: true,
})
export class UserCreateManyInput {
  @TypeGraphQL.Field((_type) => String, {
    nullable: true,
  })
  id?: string | undefined

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  email!: string

  @TypeGraphQL.Field((_type) => String, {
    nullable: true,
  })
  name?: string | undefined

  @TypeGraphQL.Field((_type) => String, {
    nullable: true,
  })
  password?: string | undefined

  @TypeGraphQL.Field((_type) => UserCreatefollowerIDsInput, {
    nullable: true,
  })
  followerIDs?: UserCreatefollowerIDsInput | undefined

  @TypeGraphQL.Field((_type) => UserCreatefollowingIDsInput, {
    nullable: true,
  })
  followingIDs?: UserCreatefollowingIDsInput | undefined

  @TypeGraphQL.Field((_type) => UserCreatelikePostIDsInput, {
    nullable: true,
  })
  likePostIDs?: UserCreatelikePostIDsInput | undefined

  @TypeGraphQL.Field((_type) => UserCreaterolesInput, {
    nullable: true,
  })
  roles?: UserCreaterolesInput | undefined
}
