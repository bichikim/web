import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostWhereInput } from "../inputs/PostWhereInput";

@TypeGraphQL.InputType("PostRelationFilter", {
  isAbstract: true
})
export class PostRelationFilter {
  @TypeGraphQL.Field(_type => PostWhereInput, {
    nullable: true
  })
  is?: PostWhereInput | undefined;

  @TypeGraphQL.Field(_type => PostWhereInput, {
    nullable: true
  })
  isNot?: PostWhereInput | undefined;
}
