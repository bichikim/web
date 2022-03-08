import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostUpdatelikeIDsInput } from "../inputs/PostUpdatelikeIDsInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { UserUpdateOneWithoutPostsInput } from "../inputs/UserUpdateOneWithoutPostsInput";

@TypeGraphQL.InputType("PostUpdateWithoutLikesInput", {
  isAbstract: true
})
export class PostUpdateWithoutLikesInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  title?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdateOneWithoutPostsInput, {
    nullable: true
  })
  author?: UserUpdateOneWithoutPostsInput | undefined;

  @TypeGraphQL.Field(_type => PostUpdatelikeIDsInput, {
    nullable: true
  })
  likeIDs?: PostUpdatelikeIDsInput | undefined;
}
