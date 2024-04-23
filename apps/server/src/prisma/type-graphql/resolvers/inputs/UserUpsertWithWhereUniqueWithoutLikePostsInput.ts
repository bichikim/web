import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateWithoutLikePostsInput } from "../inputs/UserCreateWithoutLikePostsInput";
import { UserUpdateWithoutLikePostsInput } from "../inputs/UserUpdateWithoutLikePostsInput";
import { UserWhereUniqueInput } from "../inputs/UserWhereUniqueInput";

@TypeGraphQL.InputType("UserUpsertWithWhereUniqueWithoutLikePostsInput", {})
export class UserUpsertWithWhereUniqueWithoutLikePostsInput {
  @TypeGraphQL.Field(_type => UserWhereUniqueInput, {
    nullable: false
  })
  where!: UserWhereUniqueInput;

  @TypeGraphQL.Field(_type => UserUpdateWithoutLikePostsInput, {
    nullable: false
  })
  update!: UserUpdateWithoutLikePostsInput;

  @TypeGraphQL.Field(_type => UserCreateWithoutLikePostsInput, {
    nullable: false
  })
  create!: UserCreateWithoutLikePostsInput;
}
