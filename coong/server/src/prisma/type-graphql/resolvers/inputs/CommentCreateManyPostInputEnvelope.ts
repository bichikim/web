import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentCreateManyPostInput } from "../inputs/CommentCreateManyPostInput";

@TypeGraphQL.InputType("CommentCreateManyPostInputEnvelope", {})
export class CommentCreateManyPostInputEnvelope {
  @TypeGraphQL.Field(_type => [CommentCreateManyPostInput], {
    nullable: false
  })
  data!: CommentCreateManyPostInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
