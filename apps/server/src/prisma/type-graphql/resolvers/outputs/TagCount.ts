import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { TagCountPostsArgs } from "./args/TagCountPostsArgs";

@TypeGraphQL.ObjectType("TagCount", {})
export class TagCount {
  posts!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "posts",
    nullable: false
  })
  getPosts(@TypeGraphQL.Root() root: TagCount, @TypeGraphQL.Args() args: TagCountPostsArgs): number {
    return root.posts;
  }
}
