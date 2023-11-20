import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreateNestedManyWithoutTagsInput } from "../inputs/PostCreateNestedManyWithoutTagsInput";

@TypeGraphQL.InputType("TagCreateInput", {})
export class TagCreateInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  id?: string | undefined;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  name!: string;

  @TypeGraphQL.Field(_type => PostCreateNestedManyWithoutTagsInput, {
    nullable: true
  })
  posts?: PostCreateNestedManyWithoutTagsInput | undefined;
}
