import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentUpdateWithoutPortInput } from "../inputs/CommentUpdateWithoutPortInput";
import { CommentWhereUniqueInput } from "../inputs/CommentWhereUniqueInput";

@TypeGraphQL.InputType("CommentUpdateWithWhereUniqueWithoutPortInput", {})
export class CommentUpdateWithWhereUniqueWithoutPortInput {
  @TypeGraphQL.Field(_type => CommentWhereUniqueInput, {
    nullable: false
  })
  where!: CommentWhereUniqueInput;

  @TypeGraphQL.Field(_type => CommentUpdateWithoutPortInput, {
    nullable: false
  })
  data!: CommentUpdateWithoutPortInput;
}
