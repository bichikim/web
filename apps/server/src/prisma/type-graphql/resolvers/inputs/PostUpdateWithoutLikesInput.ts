import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentUpdateManyWithoutPostNestedInput } from "../inputs/CommentUpdateManyWithoutPostNestedInput";
import { NullableStringFieldUpdateOperationsInput } from "../inputs/NullableStringFieldUpdateOperationsInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { TagUpdateManyWithoutPostsNestedInput } from "../inputs/TagUpdateManyWithoutPostsNestedInput";
import { UserUpdateOneRequiredWithoutPostsNestedInput } from "../inputs/UserUpdateOneRequiredWithoutPostsNestedInput";

@TypeGraphQL.InputType("PostUpdateWithoutLikesInput", {})
export class PostUpdateWithoutLikesInput {
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

  @TypeGraphQL.Field(_type => TagUpdateManyWithoutPostsNestedInput, {
    nullable: true
  })
  tags?: TagUpdateManyWithoutPostsNestedInput | undefined;

  @TypeGraphQL.Field(_type => CommentUpdateManyWithoutPostNestedInput, {
    nullable: true
  })
  comments?: CommentUpdateManyWithoutPostNestedInput | undefined;
}
