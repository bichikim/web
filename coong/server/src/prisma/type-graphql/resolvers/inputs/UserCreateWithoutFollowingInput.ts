import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentCreateNestedManyWithoutAuthorInput } from "../inputs/CommentCreateNestedManyWithoutAuthorInput";
import { PostCreateNestedManyWithoutAuthorInput } from "../inputs/PostCreateNestedManyWithoutAuthorInput";
import { PostCreateNestedManyWithoutLikesInput } from "../inputs/PostCreateNestedManyWithoutLikesInput";
import { UserCreateNestedManyWithoutFollowingInput } from "../inputs/UserCreateNestedManyWithoutFollowingInput";
import { UserCreatefollowerIDsInput } from "../inputs/UserCreatefollowerIDsInput";
import { UserCreatefollowingIDsInput } from "../inputs/UserCreatefollowingIDsInput";
import { UserCreatelikePostIDsInput } from "../inputs/UserCreatelikePostIDsInput";
import { UserCreaterolesInput } from "../inputs/UserCreaterolesInput";

@TypeGraphQL.InputType("UserCreateWithoutFollowingInput", {
  isAbstract: true
})
export class UserCreateWithoutFollowingInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  id?: string | undefined;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  email!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  name?: string | undefined;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  password?: string | undefined;

  @TypeGraphQL.Field(_type => UserCreateNestedManyWithoutFollowingInput, {
    nullable: true
  })
  followers?: UserCreateNestedManyWithoutFollowingInput | undefined;

  @TypeGraphQL.Field(_type => UserCreatefollowerIDsInput, {
    nullable: true
  })
  followerIDs?: UserCreatefollowerIDsInput | undefined;

  @TypeGraphQL.Field(_type => UserCreatefollowingIDsInput, {
    nullable: true
  })
  followingIDs?: UserCreatefollowingIDsInput | undefined;

  @TypeGraphQL.Field(_type => PostCreateNestedManyWithoutLikesInput, {
    nullable: true
  })
  likePosts?: PostCreateNestedManyWithoutLikesInput | undefined;

  @TypeGraphQL.Field(_type => UserCreatelikePostIDsInput, {
    nullable: true
  })
  likePostIDs?: UserCreatelikePostIDsInput | undefined;

  @TypeGraphQL.Field(_type => PostCreateNestedManyWithoutAuthorInput, {
    nullable: true
  })
  posts?: PostCreateNestedManyWithoutAuthorInput | undefined;

  @TypeGraphQL.Field(_type => CommentCreateNestedManyWithoutAuthorInput, {
    nullable: true
  })
  comments?: CommentCreateNestedManyWithoutAuthorInput | undefined;

  @TypeGraphQL.Field(_type => UserCreaterolesInput, {
    nullable: true
  })
  roles?: UserCreaterolesInput | undefined;
}
