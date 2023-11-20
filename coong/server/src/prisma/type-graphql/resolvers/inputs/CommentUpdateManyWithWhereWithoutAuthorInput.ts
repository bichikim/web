import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentScalarWhereInput } from "../inputs/CommentScalarWhereInput";
import { CommentUpdateManyMutationInput } from "../inputs/CommentUpdateManyMutationInput";

@TypeGraphQL.InputType("CommentUpdateManyWithWhereWithoutAuthorInput", {})
export class CommentUpdateManyWithWhereWithoutAuthorInput {
  @TypeGraphQL.Field(_type => CommentScalarWhereInput, {
    nullable: false
  })
  where!: CommentScalarWhereInput;

  @TypeGraphQL.Field(_type => CommentUpdateManyMutationInput, {
    nullable: false
  })
  data!: CommentUpdateManyMutationInput;
}
