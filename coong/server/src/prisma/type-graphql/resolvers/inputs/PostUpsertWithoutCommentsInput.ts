import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreateWithoutCommentsInput } from "../inputs/PostCreateWithoutCommentsInput";
import { PostUpdateWithoutCommentsInput } from "../inputs/PostUpdateWithoutCommentsInput";

@TypeGraphQL.InputType("PostUpsertWithoutCommentsInput", {
  isAbstract: true
})
export class PostUpsertWithoutCommentsInput {
  @TypeGraphQL.Field(_type => PostUpdateWithoutCommentsInput, {
    nullable: false
  })
  update!: PostUpdateWithoutCommentsInput;

  @TypeGraphQL.Field(_type => PostCreateWithoutCommentsInput, {
    nullable: false
  })
  create!: PostCreateWithoutCommentsInput;
}
