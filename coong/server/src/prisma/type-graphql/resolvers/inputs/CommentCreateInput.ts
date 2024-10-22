import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreateNestedOneWithoutCommentsInput } from "../inputs/PostCreateNestedOneWithoutCommentsInput";
import { UserCreateNestedOneWithoutCommentsInput } from "../inputs/UserCreateNestedOneWithoutCommentsInput";

@TypeGraphQL.InputType("CommentCreateInput", {})
export class CommentCreateInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  message!: string;

  @TypeGraphQL.Field(_type => PostCreateNestedOneWithoutCommentsInput, {
    nullable: false
  })
  post!: PostCreateNestedOneWithoutCommentsInput;

  @TypeGraphQL.Field(_type => UserCreateNestedOneWithoutCommentsInput, {
    nullable: false
  })
  author!: UserCreateNestedOneWithoutCommentsInput;
}
