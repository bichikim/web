import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateOrConnectWithoutFollowersInput } from "../inputs/UserCreateOrConnectWithoutFollowersInput";
import { UserCreateWithoutFollowersInput } from "../inputs/UserCreateWithoutFollowersInput";
import { UserScalarWhereInput } from "../inputs/UserScalarWhereInput";
import { UserUpdateManyWithWhereWithoutFollowersInput } from "../inputs/UserUpdateManyWithWhereWithoutFollowersInput";
import { UserUpdateWithWhereUniqueWithoutFollowersInput } from "../inputs/UserUpdateWithWhereUniqueWithoutFollowersInput";
import { UserUpsertWithWhereUniqueWithoutFollowersInput } from "../inputs/UserUpsertWithWhereUniqueWithoutFollowersInput";
import { UserWhereUniqueInput } from "../inputs/UserWhereUniqueInput";

@TypeGraphQL.InputType({
  isAbstract: true
})
export class UserUpdateManyWithoutFollowersInput {
  @TypeGraphQL.Field(_type => [UserCreateWithoutFollowersInput], {
    nullable: true
  })
  create?: UserCreateWithoutFollowersInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserCreateOrConnectWithoutFollowersInput], {
    nullable: true
  })
  connectOrCreate?: UserCreateOrConnectWithoutFollowersInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserUpsertWithWhereUniqueWithoutFollowersInput], {
    nullable: true
  })
  upsert?: UserUpsertWithWhereUniqueWithoutFollowersInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserWhereUniqueInput], {
    nullable: true
  })
  connect?: UserWhereUniqueInput[] | undefined;

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

  @TypeGraphQL.Field(_type => [UserUpdateWithWhereUniqueWithoutFollowersInput], {
    nullable: true
  })
  update?: UserUpdateWithWhereUniqueWithoutFollowersInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserUpdateManyWithWhereWithoutFollowersInput], {
    nullable: true
  })
  updateMany?: UserUpdateManyWithWhereWithoutFollowersInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserScalarWhereInput], {
    nullable: true
  })
  deleteMany?: UserScalarWhereInput[] | undefined;
}
