import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { StringNullableListFilter } from "../inputs/StringNullableListFilter";
import { StringWithAggregatesFilter } from "../inputs/StringWithAggregatesFilter";

@TypeGraphQL.InputType("TagScalarWhereWithAggregatesInput", {
  isAbstract: true
})
export class TagScalarWhereWithAggregatesInput {
  @TypeGraphQL.Field(_type => [TagScalarWhereWithAggregatesInput], {
    nullable: true
  })
  AND?: TagScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagScalarWhereWithAggregatesInput], {
    nullable: true
  })
  OR?: TagScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagScalarWhereWithAggregatesInput], {
    nullable: true
  })
  NOT?: TagScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  id?: StringWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  name?: StringWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableListFilter, {
    nullable: true
  })
  postIDs?: StringNullableListFilter | undefined;
}
