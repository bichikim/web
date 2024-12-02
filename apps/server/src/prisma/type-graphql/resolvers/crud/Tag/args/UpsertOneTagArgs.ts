import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TagCreateInput } from "../../../inputs/TagCreateInput";
import { TagUpdateInput } from "../../../inputs/TagUpdateInput";
import { TagWhereUniqueInput } from "../../../inputs/TagWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpsertOneTagArgs {
  @TypeGraphQL.Field(_type => TagWhereUniqueInput, {
    nullable: false
  })
  where!: TagWhereUniqueInput;

  @TypeGraphQL.Field(_type => TagCreateInput, {
    nullable: false
  })
  create!: TagCreateInput;

  @TypeGraphQL.Field(_type => TagUpdateInput, {
    nullable: false
  })
  update!: TagUpdateInput;
}
