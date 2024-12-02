import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateOrConnectWithoutCommentsInput } from "../inputs/UserCreateOrConnectWithoutCommentsInput";
import { UserCreateWithoutCommentsInput } from "../inputs/UserCreateWithoutCommentsInput";
import { UserWhereUniqueInput } from "../inputs/UserWhereUniqueInput";

@TypeGraphQL.InputType("UserCreateNestedOneWithoutCommentsInput", {})
export class UserCreateNestedOneWithoutCommentsInput {
  @TypeGraphQL.Field(_type => UserCreateWithoutCommentsInput, {
    nullable: true
  })
  create?: UserCreateWithoutCommentsInput | undefined;

  @TypeGraphQL.Field(_type => UserCreateOrConnectWithoutCommentsInput, {
    nullable: true
  })
  connectOrCreate?: UserCreateOrConnectWithoutCommentsInput | undefined;

  @TypeGraphQL.Field(_type => UserWhereUniqueInput, {
    nullable: true
  })
  connect?: UserWhereUniqueInput | undefined;
}
