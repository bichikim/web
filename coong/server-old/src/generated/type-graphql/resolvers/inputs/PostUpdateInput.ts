import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostUpdatelikeIDsInput } from "../inputs/PostUpdatelikeIDsInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { UserUpdateManyWithoutLikePostsInput } from "../inputs/UserUpdateManyWithoutLikePostsInput";
import { UserUpdateOneWithoutPostsInput } from "../inputs/UserUpdateOneWithoutPostsInput";

@TypeGraphQL.InputType("PostUpdateInput", {
  isAbstract: true
})
export class PostUpdateInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  title?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateOneWithoutPostsInput, {
    nullable: true
  })
  author?: UserUpdateOneWithoutPostsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateManyWithoutLikePostsInput, {
    nullable: true
  })
  likes?: UserUpdateManyWithoutLikePostsInput | undefined;

  @TypeGraphQL.Field(_type => PostUpdatelikeIDsInput, {
    nullable: true
  })
  likeIDs?: PostUpdatelikeIDsInput | undefined;
}
