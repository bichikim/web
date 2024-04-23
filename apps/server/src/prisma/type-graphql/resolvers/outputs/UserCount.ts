import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCountCommentsArgs } from "./args/UserCountCommentsArgs";
import { UserCountFollowersArgs } from "./args/UserCountFollowersArgs";
import { UserCountFollowingArgs } from "./args/UserCountFollowingArgs";
import { UserCountLikePostsArgs } from "./args/UserCountLikePostsArgs";
import { UserCountPostsArgs } from "./args/UserCountPostsArgs";

@TypeGraphQL.ObjectType("UserCount", {})
export class UserCount {
  followers!: number;
  following!: number;
  likePosts!: number;
  posts!: number;
  comments!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "followers",
    nullable: false
  })
  getFollowers(@TypeGraphQL.Root() root: UserCount, @TypeGraphQL.Args() args: UserCountFollowersArgs): number {
    return root.followers;
  }

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "following",
    nullable: false
  })
  getFollowing(@TypeGraphQL.Root() root: UserCount, @TypeGraphQL.Args() args: UserCountFollowingArgs): number {
    return root.following;
  }

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "likePosts",
    nullable: false
  })
  getLikePosts(@TypeGraphQL.Root() root: UserCount, @TypeGraphQL.Args() args: UserCountLikePostsArgs): number {
    return root.likePosts;
  }

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "posts",
    nullable: false
  })
  getPosts(@TypeGraphQL.Root() root: UserCount, @TypeGraphQL.Args() args: UserCountPostsArgs): number {
    return root.posts;
  }

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "comments",
    nullable: false
  })
  getComments(@TypeGraphQL.Root() root: UserCount, @TypeGraphQL.Args() args: UserCountCommentsArgs): number {
    return root.comments;
  }
}
