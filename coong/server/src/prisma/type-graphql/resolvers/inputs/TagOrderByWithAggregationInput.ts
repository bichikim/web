import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { TagAvgOrderByAggregateInput } from "../inputs/TagAvgOrderByAggregateInput";
import { TagCountOrderByAggregateInput } from "../inputs/TagCountOrderByAggregateInput";
import { TagMaxOrderByAggregateInput } from "../inputs/TagMaxOrderByAggregateInput";
import { TagMinOrderByAggregateInput } from "../inputs/TagMinOrderByAggregateInput";
import { TagSumOrderByAggregateInput } from "../inputs/TagSumOrderByAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("TagOrderByWithAggregationInput", {})
export class TagOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  id?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  name?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => TagCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: TagCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TagAvgOrderByAggregateInput, {
    nullable: true
  })
  _avg?: TagAvgOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TagMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: TagMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TagMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: TagMinOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TagSumOrderByAggregateInput, {
    nullable: true
  })
  _sum?: TagSumOrderByAggregateInput | undefined;
}
