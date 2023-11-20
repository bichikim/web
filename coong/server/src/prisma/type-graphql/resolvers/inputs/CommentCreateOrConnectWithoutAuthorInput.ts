import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentCreateWithoutAuthorInput } from "../inputs/CommentCreateWithoutAuthorInput";
import { CommentWhereUniqueInput } from "../inputs/CommentWhereUniqueInput";

@TypeGraphQL.InputType("CommentCreateOrConnectWithoutAuthorInput", {})
export class CommentCreateOrConnectWithoutAuthorInput {
  @TypeGraphQL.Field(_type => CommentWhereUniqueInput, {
    nullable: false
  })
  where!: CommentWhereUniqueInput;

  @TypeGraphQL.Field(_type => CommentCreateWithoutAuthorInput, {
    nullable: false
  })
  create!: CommentCreateWithoutAuthorInput;
}
