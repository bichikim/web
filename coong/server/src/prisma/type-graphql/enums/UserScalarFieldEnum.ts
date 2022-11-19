import * as TypeGraphQL from "type-graphql";

export enum UserScalarFieldEnum {
  id = "id",
  email = "email",
  name = "name",
  password = "password",
  followerIDs = "followerIDs",
  followingIDs = "followingIDs",
  likePostIDs = "likePostIDs",
  roles = "roles"
}
TypeGraphQL.registerEnumType(UserScalarFieldEnum, {
  name: "UserScalarFieldEnum",
  description: undefined,
});
