import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreateOrConnectWithoutLikesInput } from "../inputs/PostCreateOrConnectWithoutLikesInput";
import { PostCreateWithoutLikesInput } from "../inputs/PostCreateWithoutLikesInput";
import { PostScalarWhereInput } from "../inputs/PostScalarWhereInput";
import { PostUpdateManyWithWhereWithoutLikesInput } from "../inputs/PostUpdateManyWithWhereWithoutLikesInput";
import { PostUpdateWithWhereUniqueWithoutLikesInput } from "../inputs/PostUpdateWithWhereUniqueWithoutLikesInput";
import { PostUpsertWithWhereUniqueWithoutLikesInput } from "../inputs/PostUpsertWithWhereUniqueWithoutLikesInput";
import { PostWhereUniqueInput } from "../inputs/PostWhereUniqueInput";

@TypeGraphQL.InputType("PostUpdateManyWithoutLikesInput", {
  isAbstract: true
})
export class PostUpdateManyWithoutLikesInput {
  @TypeGraphQL.Field(_type => [PostCreateWithoutLikesInput], {
    nullable: true
  })
  create?: PostCreateWithoutLikesInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostCreateOrConnectWithoutLikesInput], {
    nullable: true
  })
  connectOrCreate?: PostCreateOrConnectWithoutLikesInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostUpsertWithWhereUniqueWithoutLikesInput], {
    nullable: true
  })
  upsert?: PostUpsertWithWhereUniqueWithoutLikesInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostWhereUniqueInput], {
    nullable: true
  })
  set?: PostWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostWhereUniqueInput], {
    nullable: true
  })
  disconnect?: PostWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostWhereUniqueInput], {
    nullable: true
  })
  delete?: PostWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostWhereUniqueInput], {
    nullable: true
  })
  connect?: PostWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostUpdateWithWhereUniqueWithoutLikesInput], {
    nullable: true
  })
  update?: PostUpdateWithWhereUniqueWithoutLikesInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostUpdateManyWithWhereWithoutLikesInput], {
    nullable: true
  })
  updateMany?: PostUpdateManyWithWhereWithoutLikesInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostScalarWhereInput], {
    nullable: true
  })
  deleteMany?: PostScalarWhereInput[] | undefined;
}
