import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateOrConnectWithoutLikePostsInput } from "../inputs/UserCreateOrConnectWithoutLikePostsInput";
import { UserCreateWithoutLikePostsInput } from "../inputs/UserCreateWithoutLikePostsInput";
import { UserScalarWhereInput } from "../inputs/UserScalarWhereInput";
import { UserUpdateManyWithWhereWithoutLikePostsInput } from "../inputs/UserUpdateManyWithWhereWithoutLikePostsInput";
import { UserUpdateWithWhereUniqueWithoutLikePostsInput } from "../inputs/UserUpdateWithWhereUniqueWithoutLikePostsInput";
import { UserUpsertWithWhereUniqueWithoutLikePostsInput } from "../inputs/UserUpsertWithWhereUniqueWithoutLikePostsInput";
import { UserWhereUniqueInput } from "../inputs/UserWhereUniqueInput";

@TypeGraphQL.InputType("UserUpdateManyWithoutLikePostsNestedInput", {})
export class UserUpdateManyWithoutLikePostsNestedInput {
  @TypeGraphQL.Field(_type => [UserCreateWithoutLikePostsInput], {
    nullable: true
  })
  create?: UserCreateWithoutLikePostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserCreateOrConnectWithoutLikePostsInput], {
    nullable: true
  })
  connectOrCreate?: UserCreateOrConnectWithoutLikePostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserUpsertWithWhereUniqueWithoutLikePostsInput], {
    nullable: true
  })
  upsert?: UserUpsertWithWhereUniqueWithoutLikePostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserWhereUniqueInput], {
    nullable: true
  })
  set?: UserWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserWhereUniqueInput], {
    nullable: true
  })
  disconnect?: UserWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserWhereUniqueInput], {
    nullable: true
  })
  delete?: UserWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserWhereUniqueInput], {
    nullable: true
  })
  connect?: UserWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserUpdateWithWhereUniqueWithoutLikePostsInput], {
    nullable: true
  })
  update?: UserUpdateWithWhereUniqueWithoutLikePostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserUpdateManyWithWhereWithoutLikePostsInput], {
    nullable: true
  })
  updateMany?: UserUpdateManyWithWhereWithoutLikePostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserScalarWhereInput], {
    nullable: true
  })
  deleteMany?: UserScalarWhereInput[] | undefined;
}
