import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateWithoutCommentsInput } from "../inputs/UserCreateWithoutCommentsInput";
import { UserUpdateWithoutCommentsInput } from "../inputs/UserUpdateWithoutCommentsInput";

@TypeGraphQL.InputType("UserUpsertWithoutCommentsInput", {
  isAbstract: true
})
export class UserUpsertWithoutCommentsInput {
  @TypeGraphQL.Field(_type => UserUpdateWithoutCommentsInput, {
    nullable: false
  })
  update!: UserUpdateWithoutCommentsInput;

  @TypeGraphQL.Field(_type => UserCreateWithoutCommentsInput, {
    nullable: false
  })
  create!: UserCreateWithoutCommentsInput;
}
