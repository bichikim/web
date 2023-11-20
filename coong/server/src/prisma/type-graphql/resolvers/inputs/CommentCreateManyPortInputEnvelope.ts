import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentCreateManyPortInput } from "../inputs/CommentCreateManyPortInput";

@TypeGraphQL.InputType("CommentCreateManyPortInputEnvelope", {})
export class CommentCreateManyPortInputEnvelope {
  @TypeGraphQL.Field(_type => [CommentCreateManyPortInput], {
    nullable: false
  })
  data!: CommentCreateManyPortInput[];
}
