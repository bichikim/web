import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { TagCountOrderByAggregateInput } from "../inputs/TagCountOrderByAggregateInput";
import { TagMaxOrderByAggregateInput } from "../inputs/TagMaxOrderByAggregateInput";
import { TagMinOrderByAggregateInput } from "../inputs/TagMinOrderByAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("TagOrderByWithAggregationInput", {
  isAbstract: true
})
export class TagOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  id?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  name?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  postIDs?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => TagCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: TagCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TagMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: TagMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TagMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: TagMinOrderByAggregateInput | undefined;
}
