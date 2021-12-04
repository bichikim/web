import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { Post } from "../models/Post";
import { UserCount } from "../resolvers/outputs/UserCount";

@TypeGraphQL.ObjectType("User", {
  isAbstract: true
})
export class User {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  id!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  email!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  name?: string | null;

  password?: string | null;

  followers?: User[];

  @TypeGraphQL.Field(_type => [String], {
    nullable: false
  })
  followerIDs!: string[];

  following?: User[];

  @TypeGraphQL.Field(_type => [String], {
    nullable: false
  })
  followingIDs!: string[];

  likePosts?: Post[];

  @TypeGraphQL.Field(_type => [String], {
    nullable: false
  })
  likePostIDs!: string[];

  posts?: Post[];

  roles?: string[];

  @TypeGraphQL.Field(_type => UserCount, {
    nullable: false
  })
  _count!: UserCount;
}
