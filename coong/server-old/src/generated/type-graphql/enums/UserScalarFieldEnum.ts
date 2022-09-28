import * as TypeGraphQL from 'type-graphql'

export enum UserScalarFieldEnum {
  email = 'email',
  followerIDs = 'followerIDs',
  followingIDs = 'followingIDs',
  id = 'id',
  likePostIDs = 'likePostIDs',
  name = 'name',
  password = 'password',
  roles = 'roles',
}
TypeGraphQL.registerEnumType(UserScalarFieldEnum, {
  description: undefined,
  name: 'UserScalarFieldEnum',
})
