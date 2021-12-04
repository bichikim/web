import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateOrConnectWithoutFollowingInput } from "../inputs/UserCreateOrConnectWithoutFollowingInput";
import { UserCreateWithoutFollowingInput } from "../inputs/UserCreateWithoutFollowingInput";
import { UserWhereUniqueInput } from "../inputs/UserWhereUniqueInput";

@TypeGraphQL.InputType({
  isAbstract: true
})
export class UserCreateNestedManyWithoutFollowingInput {
  @TypeGraphQL.Field(_type => [UserCreateWithoutFollowingInput], {
    nullable: true
  })
  create?: UserCreateWithoutFollowingInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserCreateOrConnectWithoutFollowingInput], {
    nullable: true
  })
  connectOrCreate?: UserCreateOrConnectWithoutFollowingInput[] | undefined;

  @TypeGraphQL.Field(_type => [UserWhereUniqueInput], {
    nullable: true
  })
  connect?: UserWhereUniqueInput[] | undefined;
}
