import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreatelikeIDsInput } from "../inputs/PostCreatelikeIDsInput";

@TypeGraphQL.InputType("PostCreateManyInput", {
  isAbstract: true
})
export class PostCreateManyInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  id?: string | undefined;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  title!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  authorId!: string;

  @TypeGraphQL.Field(_type => PostCreatelikeIDsInput, {
    nullable: true
  })
  likeIDs?: PostCreatelikeIDsInput | undefined;
}
