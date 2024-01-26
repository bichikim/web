import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreateWithoutLikesInput } from "../inputs/PostCreateWithoutLikesInput";
import { PostUpdateWithoutLikesInput } from "../inputs/PostUpdateWithoutLikesInput";
import { PostWhereUniqueInput } from "../inputs/PostWhereUniqueInput";

@TypeGraphQL.InputType("PostUpsertWithWhereUniqueWithoutLikesInput", {})
export class PostUpsertWithWhereUniqueWithoutLikesInput {
  @TypeGraphQL.Field(_type => PostWhereUniqueInput, {
    nullable: false
  })
  where!: PostWhereUniqueInput;

  @TypeGraphQL.Field(_type => PostUpdateWithoutLikesInput, {
    nullable: false
  })
  update!: PostUpdateWithoutLikesInput;

  @TypeGraphQL.Field(_type => PostCreateWithoutLikesInput, {
    nullable: false
  })
  create!: PostCreateWithoutLikesInput;
}
