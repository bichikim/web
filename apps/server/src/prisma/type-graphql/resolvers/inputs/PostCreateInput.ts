import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentCreateNestedManyWithoutPostInput } from "../inputs/CommentCreateNestedManyWithoutPostInput";
import { TagCreateNestedManyWithoutPostsInput } from "../inputs/TagCreateNestedManyWithoutPostsInput";
import { UserCreateNestedManyWithoutLikePostsInput } from "../inputs/UserCreateNestedManyWithoutLikePostsInput";
import { UserCreateNestedOneWithoutPostsInput } from "../inputs/UserCreateNestedOneWithoutPostsInput";

@TypeGraphQL.InputType("PostCreateInput", {})
export class PostCreateInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  title!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  message?: string | undefined;

  @TypeGraphQL.Field(_type => UserCreateNestedOneWithoutPostsInput, {
    nullable: false
  })
  author!: UserCreateNestedOneWithoutPostsInput;

  @TypeGraphQL.Field(_type => UserCreateNestedManyWithoutLikePostsInput, {
    nullable: true
  })
  likes?: UserCreateNestedManyWithoutLikePostsInput | undefined;

  @TypeGraphQL.Field(_type => TagCreateNestedManyWithoutPostsInput, {
    nullable: true
  })
  tags?: TagCreateNestedManyWithoutPostsInput | undefined;

  @TypeGraphQL.Field(_type => CommentCreateNestedManyWithoutPostInput, {
    nullable: true
  })
  comments?: CommentCreateNestedManyWithoutPostInput | undefined;
}
