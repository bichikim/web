import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { NullableStringFieldUpdateOperationsInput } from "../inputs/NullableStringFieldUpdateOperationsInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { TagUpdateManyWithoutPostsNestedInput } from "../inputs/TagUpdateManyWithoutPostsNestedInput";
import { UserUpdateManyWithoutLikePostsNestedInput } from "../inputs/UserUpdateManyWithoutLikePostsNestedInput";
import { UserUpdateOneRequiredWithoutPostsNestedInput } from "../inputs/UserUpdateOneRequiredWithoutPostsNestedInput";

@TypeGraphQL.InputType("PostUpdateWithoutCommentsInput", {})
export class PostUpdateWithoutCommentsInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  title?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => NullableStringFieldUpdateOperationsInput, {
    nullable: true
  })
  message?: NullableStringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateOneRequiredWithoutPostsNestedInput, {
    nullable: true
  })
  author?: UserUpdateOneRequiredWithoutPostsNestedInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateManyWithoutLikePostsNestedInput, {
    nullable: true
  })
  likes?: UserUpdateManyWithoutLikePostsNestedInput | undefined;

  @TypeGraphQL.Field(_type => TagUpdateManyWithoutPostsNestedInput, {
    nullable: true
  })
  tags?: TagUpdateManyWithoutPostsNestedInput | undefined;
}
