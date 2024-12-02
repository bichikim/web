import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserUpdateWithoutCommentsInput } from "../inputs/UserUpdateWithoutCommentsInput";
import { UserWhereInput } from "../inputs/UserWhereInput";

@TypeGraphQL.InputType("UserUpdateToOneWithWhereWithoutCommentsInput", {})
export class UserUpdateToOneWithWhereWithoutCommentsInput {
  @TypeGraphQL.Field(_type => UserWhereInput, {
    nullable: true
  })
  where?: UserWhereInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateWithoutCommentsInput, {
    nullable: false
  })
  data!: UserUpdateWithoutCommentsInput;
}
