import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TagCreateManyInput } from "../../../inputs/TagCreateManyInput";

@TypeGraphQL.ArgsType()
export class CreateManyTagArgs {
  @TypeGraphQL.Field(_type => [TagCreateManyInput], {
    nullable: false
  })
  data!: TagCreateManyInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
