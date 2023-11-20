import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { TagWhereInput } from "../inputs/TagWhereInput";

@TypeGraphQL.InputType("TagListRelationFilter", {})
export class TagListRelationFilter {
  @TypeGraphQL.Field(_type => TagWhereInput, {
    nullable: true
  })
  every?: TagWhereInput | undefined;

  @TypeGraphQL.Field(_type => TagWhereInput, {
    nullable: true
  })
  some?: TagWhereInput | undefined;

  @TypeGraphQL.Field(_type => TagWhereInput, {
    nullable: true
  })
  none?: TagWhereInput | undefined;
}
