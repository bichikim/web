import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TagWhereInput } from "../../inputs/TagWhereInput";

@TypeGraphQL.ArgsType()
export class PostCountTagsArgs {
  @TypeGraphQL.Field(_type => TagWhereInput, {
    nullable: true
  })
  where?: TagWhereInput | undefined;
}
