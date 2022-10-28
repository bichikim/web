import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TagUpdateInput } from "../../../inputs/TagUpdateInput";
import { TagWhereUniqueInput } from "../../../inputs/TagWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpdateOneTagArgs {
  @TypeGraphQL.Field(_type => TagUpdateInput, {
    nullable: false
  })
  data!: TagUpdateInput;

  @TypeGraphQL.Field(_type => TagWhereUniqueInput, {
    nullable: false
  })
  where!: TagWhereUniqueInput;
}
