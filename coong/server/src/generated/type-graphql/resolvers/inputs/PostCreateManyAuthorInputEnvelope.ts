import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreateManyAuthorInput } from "../inputs/PostCreateManyAuthorInput";

@TypeGraphQL.InputType("PostCreateManyAuthorInputEnvelope", {
  isAbstract: true
})
export class PostCreateManyAuthorInputEnvelope {
  @TypeGraphQL.Field(_type => [PostCreateManyAuthorInput], {
    nullable: false
  })
  data!: PostCreateManyAuthorInput[];
}
