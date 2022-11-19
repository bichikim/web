import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentWhereInput } from "../inputs/CommentWhereInput";

@TypeGraphQL.InputType("CommentListRelationFilter", {
  isAbstract: true
})
export class CommentListRelationFilter {
  @TypeGraphQL.Field(_type => CommentWhereInput, {
    nullable: true
  })
  every?: CommentWhereInput | undefined;

  @TypeGraphQL.Field(_type => CommentWhereInput, {
    nullable: true
  })
  some?: CommentWhereInput | undefined;

  @TypeGraphQL.Field(_type => CommentWhereInput, {
    nullable: true
  })
  none?: CommentWhereInput | undefined;
}
