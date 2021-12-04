import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { User } from "../models/User";
import { PostCount } from "../resolvers/outputs/PostCount";

@TypeGraphQL.ObjectType("Post", {
  isAbstract: true
})
export class Post {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  id!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  title!: string;

  author?: User | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  authorId!: string;

  likes?: User[];

  @TypeGraphQL.Field(_type => [String], {
    nullable: false
  })
  likeIDs!: string[];

  @TypeGraphQL.Field(_type => PostCount, {
    nullable: false
  })
  _count!: PostCount;
}
