import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateManyfollowerIDsInput } from "../inputs/UserCreateManyfollowerIDsInput";
import { UserCreateManyfollowingIDsInput } from "../inputs/UserCreateManyfollowingIDsInput";
import { UserCreateManylikePostIDsInput } from "../inputs/UserCreateManylikePostIDsInput";
import { UserCreateManyrolesInput } from "../inputs/UserCreateManyrolesInput";

@TypeGraphQL.InputType("UserCreateManyInput", {
  isAbstract: true
})
export class UserCreateManyInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  id?: string | undefined;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  email!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  name?: string | undefined;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  password?: string | undefined;

  @TypeGraphQL.Field(_type => UserCreateManyfollowerIDsInput, {
    nullable: true
  })
  followerIDs?: UserCreateManyfollowerIDsInput | undefined;

  @TypeGraphQL.Field(_type => UserCreateManyfollowingIDsInput, {
    nullable: true
  })
  followingIDs?: UserCreateManyfollowingIDsInput | undefined;

  @TypeGraphQL.Field(_type => UserCreateManylikePostIDsInput, {
    nullable: true
  })
  likePostIDs?: UserCreateManylikePostIDsInput | undefined;

  @TypeGraphQL.Field(_type => UserCreateManyrolesInput, {
    nullable: true
  })
  roles?: UserCreateManyrolesInput | undefined;
}
