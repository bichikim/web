import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateOrConnectWithoutCommentsInput } from "../inputs/UserCreateOrConnectWithoutCommentsInput";
import { UserCreateWithoutCommentsInput } from "../inputs/UserCreateWithoutCommentsInput";
import { UserUpdateToOneWithWhereWithoutCommentsInput } from "../inputs/UserUpdateToOneWithWhereWithoutCommentsInput";
import { UserUpsertWithoutCommentsInput } from "../inputs/UserUpsertWithoutCommentsInput";
import { UserWhereUniqueInput } from "../inputs/UserWhereUniqueInput";

@TypeGraphQL.InputType("UserUpdateOneRequiredWithoutCommentsNestedInput", {})
export class UserUpdateOneRequiredWithoutCommentsNestedInput {
  @TypeGraphQL.Field(_type => UserCreateWithoutCommentsInput, {
    nullable: true
  })
  create?: UserCreateWithoutCommentsInput | undefined;

  @TypeGraphQL.Field(_type => UserCreateOrConnectWithoutCommentsInput, {
    nullable: true
  })
  connectOrCreate?: UserCreateOrConnectWithoutCommentsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpsertWithoutCommentsInput, {
    nullable: true
  })
  upsert?: UserUpsertWithoutCommentsInput | undefined;

  @TypeGraphQL.Field(_type => UserWhereUniqueInput, {
    nullable: true
  })
  connect?: UserWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateToOneWithWhereWithoutCommentsInput, {
    nullable: true
  })
  update?: UserUpdateToOneWithWhereWithoutCommentsInput | undefined;
}
