import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCountCommentsArgs } from "./args/PostCountCommentsArgs";
import { PostCountLikesArgs } from "./args/PostCountLikesArgs";
import { PostCountTagsArgs } from "./args/PostCountTagsArgs";

@TypeGraphQL.ObjectType("PostCount", {})
export class PostCount {
  likes!: number;
  tags!: number;
  comments!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "likes",
    nullable: false
  })
  getLikes(@TypeGraphQL.Root() root: PostCount, @TypeGraphQL.Args() args: PostCountLikesArgs): number {
    return root.likes;
  }

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "tags",
    nullable: false
  })
  getTags(@TypeGraphQL.Root() root: PostCount, @TypeGraphQL.Args() args: PostCountTagsArgs): number {
    return root.tags;
  }

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "comments",
    nullable: false
  })
  getComments(@TypeGraphQL.Root() root: PostCount, @TypeGraphQL.Args() args: PostCountCommentsArgs): number {
    return root.comments;
  }
}
