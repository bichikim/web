import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentCreateWithoutAuthorInput } from "../inputs/CommentCreateWithoutAuthorInput";
import { CommentUpdateWithoutAuthorInput } from "../inputs/CommentUpdateWithoutAuthorInput";
import { CommentWhereUniqueInput } from "../inputs/CommentWhereUniqueInput";

@TypeGraphQL.InputType("CommentUpsertWithWhereUniqueWithoutAuthorInput", {})
export class CommentUpsertWithWhereUniqueWithoutAuthorInput {
  @TypeGraphQL.Field(_type => CommentWhereUniqueInput, {
    nullable: false
  })
  where!: CommentWhereUniqueInput;

  @TypeGraphQL.Field(_type => CommentUpdateWithoutAuthorInput, {
    nullable: false
  })
  update!: CommentUpdateWithoutAuthorInput;

  @TypeGraphQL.Field(_type => CommentCreateWithoutAuthorInput, {
    nullable: false
  })
  create!: CommentCreateWithoutAuthorInput;
}
