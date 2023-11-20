import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { Post } from "../models/Post";
import { TagCount } from "../resolvers/outputs/TagCount";

@TypeGraphQL.ObjectType("Tag", {})
export class Tag {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  id!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  name!: string;

  posts?: Post[];

  @TypeGraphQL.Field(_type => [String], {
    nullable: false
  })
  postIDs!: string[];

  @TypeGraphQL.Field(_type => TagCount, {
    nullable: true
  })
  _count?: TagCount | null;
}
