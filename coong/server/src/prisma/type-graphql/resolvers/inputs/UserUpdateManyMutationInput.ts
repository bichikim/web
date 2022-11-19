import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { NullableStringFieldUpdateOperationsInput } from "../inputs/NullableStringFieldUpdateOperationsInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { UserUpdatefollowerIDsInput } from "../inputs/UserUpdatefollowerIDsInput";
import { UserUpdatefollowingIDsInput } from "../inputs/UserUpdatefollowingIDsInput";
import { UserUpdatelikePostIDsInput } from "../inputs/UserUpdatelikePostIDsInput";
import { UserUpdaterolesInput } from "../inputs/UserUpdaterolesInput";

@TypeGraphQL.InputType("UserUpdateManyMutationInput", {
  isAbstract: true
})
export class UserUpdateManyMutationInput {
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

  @TypeGraphQL.Field(_type => UserUpdatefollowerIDsInput, {
    nullable: true
  })
  followerIDs?: UserUpdatefollowerIDsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdatefollowingIDsInput, {
    nullable: true
  })
  followingIDs?: UserUpdatefollowingIDsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdatelikePostIDsInput, {
    nullable: true
  })
  likePostIDs?: UserUpdatelikePostIDsInput | undefined;

  @TypeGraphQL.Field(_type => UserUpdaterolesInput, {
    nullable: true
  })
  roles?: UserUpdaterolesInput | undefined;
}
