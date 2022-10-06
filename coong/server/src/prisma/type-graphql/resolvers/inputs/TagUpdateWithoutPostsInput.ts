import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { TagUpdatepostIDsInput } from "../inputs/TagUpdatepostIDsInput";

@TypeGraphQL.InputType("TagUpdateWithoutPostsInput", {
  isAbstract: true
})
export class TagUpdateWithoutPostsInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  name?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => TagUpdatepostIDsInput, {
    nullable: true
  })
  postIDs?: TagUpdatepostIDsInput | undefined;
}
