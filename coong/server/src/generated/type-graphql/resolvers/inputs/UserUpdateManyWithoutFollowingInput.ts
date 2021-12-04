import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateOrConnectWithoutFollowingInput } from "../inputs/UserCreateOrConnectWithoutFollowingInput";
import { UserCreateWithoutFollowingInput } from "../inputs/UserCreateWithoutFollowingInput";
import { UserScalarWhereInput } from "../inputs/UserScalarWhereInput";
import { UserUpdateManyWithWhereWithoutFollowingInput } from "../inputs/UserUpdateManyWithWhereWithoutFollowingInput";
import { UserUpdateWithWhereUniqueWithoutFollowingInput } from "../inputs/UserUpdateWithWhereUniqueWithoutFollowingInput";
import { UserUpsertWithWhereUniqueWithoutFollowingInput } from "../inputs/UserUpsertWithWhereUniqueWithoutFollowingInput";
import { UserWhereUniqueInput } from "../inputs/UserWhereUniqueInput";

@TypeGraphQL.InputType({
  isAbstract: true
})
export class UserUpdateManyWithoutFollowingInput {
  @TypeGraphQL.Field(_type => [UserCreateWithoutFollowingInput], {
    nullable: true
  })
  create?: UserCreateWithoutFollowingInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserCreateOrConnectWithoutFollowingInput], {
    nullable: true
  })
  connectOrCreate?: UserCreateOrConnectWithoutFollowingInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserUpsertWithWhereUniqueWithoutFollowingInput], {
    nullable: true
  })
  upsert?: UserUpsertWithWhereUniqueWithoutFollowingInput[] | undefined;

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

  @TypeGraphQL.Field(_type => [UserUpdateWithWhereUniqueWithoutFollowingInput], {
    nullable: true
  })
  update?: UserUpdateWithWhereUniqueWithoutFollowingInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserUpdateManyWithWhereWithoutFollowingInput], {
    nullable: true
  })
  updateMany?: UserUpdateManyWithWhereWithoutFollowingInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserScalarWhereInput], {
    nullable: true
  })
  deleteMany?: UserScalarWhereInput[] | undefined;
}
