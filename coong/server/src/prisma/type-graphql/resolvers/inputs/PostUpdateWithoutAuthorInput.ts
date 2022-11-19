import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentUpdateManyWithoutPortNestedInput } from "../inputs/CommentUpdateManyWithoutPortNestedInput";
import { NullableStringFieldUpdateOperationsInput } from "../inputs/NullableStringFieldUpdateOperationsInput";
import { PostUpdatelikeIDsInput } from "../inputs/PostUpdatelikeIDsInput";
import { PostUpdatetagIDsInput } from "../inputs/PostUpdatetagIDsInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { TagUpdateManyWithoutPostsNestedInput } from "../inputs/TagUpdateManyWithoutPostsNestedInput";
import { UserUpdateManyWithoutLikePostsNestedInput } from "../inputs/UserUpdateManyWithoutLikePostsNestedInput";

@TypeGraphQL.InputType("PostUpdateWithoutAuthorInput", {
  isAbstract: true
})
export class PostUpdateWithoutAuthorInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  title?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => NullableStringFieldUpdateOperationsInput, {
    nullable: true
  })
  message?: NullableStringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateManyWithoutLikePostsNestedInput, {
    nullable: true
  })
  likes?: UserUpdateManyWithoutLikePostsNestedInput | undefined;

  @TypeGraphQL.Field(_type => PostUpdatelikeIDsInput, {
    nullable: true
  })
  likeIDs?: PostUpdatelikeIDsInput | undefined;

  @TypeGraphQL.Field(_type => TagUpdateManyWithoutPostsNestedInput, {
    nullable: true
  })
  tags?: TagUpdateManyWithoutPostsNestedInput | undefined;

  @TypeGraphQL.Field(_type => PostUpdatetagIDsInput, {
    nullable: true
  })
  tagIDs?: PostUpdatetagIDsInput | undefined;

  @TypeGraphQL.Field(_type => CommentUpdateManyWithoutPortNestedInput, {
    nullable: true
  })
  comments?: CommentUpdateManyWithoutPortNestedInput | undefined;
}
