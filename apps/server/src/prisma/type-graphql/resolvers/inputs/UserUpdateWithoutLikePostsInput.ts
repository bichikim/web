import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentUpdateManyWithoutAuthorNestedInput } from "../inputs/CommentUpdateManyWithoutAuthorNestedInput";
import { NullableStringFieldUpdateOperationsInput } from "../inputs/NullableStringFieldUpdateOperationsInput";
import { PostUpdateManyWithoutAuthorNestedInput } from "../inputs/PostUpdateManyWithoutAuthorNestedInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { UserUpdateManyWithoutFollowersNestedInput } from "../inputs/UserUpdateManyWithoutFollowersNestedInput";
import { UserUpdateManyWithoutFollowingNestedInput } from "../inputs/UserUpdateManyWithoutFollowingNestedInput";
import { UserUpdaterolesInput } from "../inputs/UserUpdaterolesInput";

@TypeGraphQL.InputType("UserUpdateWithoutLikePostsInput", {})
export class UserUpdateWithoutLikePostsInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  email?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => NullableStringFieldUpdateOperationsInput, {
    nullable: true
  })
  name?: NullableStringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => NullableStringFieldUpdateOperationsInput, {
    nullable: true
  })
  password?: NullableStringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdaterolesInput, {
    nullable: true
  })
  roles?: UserUpdaterolesInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateManyWithoutFollowingNestedInput, {
    nullable: true
  })
  followers?: UserUpdateManyWithoutFollowingNestedInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateManyWithoutFollowersNestedInput, {
    nullable: true
  })
  following?: UserUpdateManyWithoutFollowersNestedInput | undefined;

  @TypeGraphQL.Field(_type => PostUpdateManyWithoutAuthorNestedInput, {
    nullable: true
  })
  posts?: PostUpdateManyWithoutAuthorNestedInput | undefined;

  @TypeGraphQL.Field(_type => CommentUpdateManyWithoutAuthorNestedInput, {
    nullable: true
  })
  comments?: CommentUpdateManyWithoutAuthorNestedInput | undefined;
}
