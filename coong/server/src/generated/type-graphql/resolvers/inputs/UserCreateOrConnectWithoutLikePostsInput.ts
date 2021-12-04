import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateWithoutLikePostsInput } from "../inputs/UserCreateWithoutLikePostsInput";
import { UserWhereUniqueInput } from "../inputs/UserWhereUniqueInput";

@TypeGraphQL.InputType("UserCreateOrConnectWithoutLikePostsInput", {
  isAbstract: true
})
export class UserCreateOrConnectWithoutLikePostsInput {
  @TypeGraphQL.Field(_type => UserWhereUniqueInput, {
    nullable: false
  })
  where!: UserWhereUniqueInput;

  @TypeGraphQL.Field(_type => UserCreateWithoutLikePostsInput, {
    nullable: false
  })
  create!: UserCreateWithoutLikePostsInput;
}
