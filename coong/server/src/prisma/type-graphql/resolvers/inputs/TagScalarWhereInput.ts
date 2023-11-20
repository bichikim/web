import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { StringFilter } from "../inputs/StringFilter";
import { StringNullableListFilter } from "../inputs/StringNullableListFilter";

@TypeGraphQL.InputType("TagScalarWhereInput", {})
export class TagScalarWhereInput {
  @TypeGraphQL.Field(_type => [TagScalarWhereInput], {
    nullable: true
  })
  AND?: TagScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagScalarWhereInput], {
    nullable: true
  })
  OR?: TagScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagScalarWhereInput], {
    nullable: true
  })
  NOT?: TagScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  id?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  name?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableListFilter, {
    nullable: true
  })
  postIDs?: StringNullableListFilter | undefined;
}
