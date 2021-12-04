import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateWithoutFollowingInput } from "../inputs/UserCreateWithoutFollowingInput";
import { UserUpdateWithoutFollowingInput } from "../inputs/UserUpdateWithoutFollowingInput";
import { UserWhereUniqueInput } from "../inputs/UserWhereUniqueInput";

@TypeGraphQL.InputType({
  isAbstract: true
})
export class UserUpsertWithWhereUniqueWithoutFollowingInput {
  @TypeGraphQL.Field(_type => UserWhereUniqueInput, {
    nullable: false
  })
  where!: UserWhereUniqueInput;

  @TypeGraphQL.Field(_type => UserUpdateWithoutFollowingInput, {
    nullable: false
  })
  update!: UserUpdateWithoutFollowingInput;

  @TypeGraphQL.Field(_type => UserCreateWithoutFollowingInput, {
    nullable: false
  })
  create!: UserCreateWithoutFollowingInput;
}
