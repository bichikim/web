import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreateWithoutTagsInput } from "../inputs/PostCreateWithoutTagsInput";
import { PostUpdateWithoutTagsInput } from "../inputs/PostUpdateWithoutTagsInput";
import { PostWhereUniqueInput } from "../inputs/PostWhereUniqueInput";

@TypeGraphQL.InputType("PostUpsertWithWhereUniqueWithoutTagsInput", {
  isAbstract: true
})
export class PostUpsertWithWhereUniqueWithoutTagsInput {
  @TypeGraphQL.Field(_type => PostWhereUniqueInput, {
    nullable: false
  })
  where!: PostWhereUniqueInput;

  @TypeGraphQL.Field(_type => PostUpdateWithoutTagsInput, {
    nullable: false
  })
  update!: PostUpdateWithoutTagsInput;

  @TypeGraphQL.Field(_type => PostCreateWithoutTagsInput, {
    nullable: false
  })
  create!: PostCreateWithoutTagsInput;
}
