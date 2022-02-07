import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserWhereInput } from "../inputs/UserWhereInput";

@TypeGraphQL.InputType("UserListRelationFilter", {
  isAbstract: true
})
export class UserListRelationFilter {
  @TypeGraphQL.Field(_type => UserWhereInput, {
    nullable: true
  })
  every?: UserWhereInput | undefined;

  @TypeGraphQL.Field(_type => UserWhereInput, {
    nullable: true
  })
  some?: UserWhereInput | undefined;

  @TypeGraphQL.Field(_type => UserWhereInput, {
    nullable: true
  })
  none?: UserWhereInput | undefined;
}
