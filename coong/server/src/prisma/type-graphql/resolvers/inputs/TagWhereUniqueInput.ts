import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostListRelationFilter } from "../inputs/PostListRelationFilter";
import { StringFilter } from "../inputs/StringFilter";
import { StringNullableListFilter } from "../inputs/StringNullableListFilter";
import { TagWhereInput } from "../inputs/TagWhereInput";

@TypeGraphQL.InputType("TagWhereUniqueInput", {})
export class TagWhereUniqueInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  id?: string | undefined;

  @TypeGraphQL.Field(_type => [TagWhereInput], {
    nullable: true
  })
  AND?: TagWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagWhereInput], {
    nullable: true
  })
  OR?: TagWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagWhereInput], {
    nullable: true
  })
  NOT?: TagWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  name?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableListFilter, {
    nullable: true
  })
  postIDs?: StringNullableListFilter | undefined;

  @TypeGraphQL.Field(_type => PostListRelationFilter, {
    nullable: true
  })
  posts?: PostListRelationFilter | undefined;
}
