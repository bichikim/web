import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreateOrConnectWithoutTagsInput } from "../inputs/PostCreateOrConnectWithoutTagsInput";
import { PostCreateWithoutTagsInput } from "../inputs/PostCreateWithoutTagsInput";
import { PostScalarWhereInput } from "../inputs/PostScalarWhereInput";
import { PostUpdateManyWithWhereWithoutTagsInput } from "../inputs/PostUpdateManyWithWhereWithoutTagsInput";
import { PostUpdateWithWhereUniqueWithoutTagsInput } from "../inputs/PostUpdateWithWhereUniqueWithoutTagsInput";
import { PostUpsertWithWhereUniqueWithoutTagsInput } from "../inputs/PostUpsertWithWhereUniqueWithoutTagsInput";
import { PostWhereUniqueInput } from "../inputs/PostWhereUniqueInput";

@TypeGraphQL.InputType("PostUpdateManyWithoutTagsNestedInput", {})
export class PostUpdateManyWithoutTagsNestedInput {
  @TypeGraphQL.Field(_type => [PostCreateWithoutTagsInput], {
    nullable: true
  })
  create?: PostCreateWithoutTagsInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostCreateOrConnectWithoutTagsInput], {
    nullable: true
  })
  connectOrCreate?: PostCreateOrConnectWithoutTagsInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostUpsertWithWhereUniqueWithoutTagsInput], {
    nullable: true
  })
  upsert?: PostUpsertWithWhereUniqueWithoutTagsInput[] | undefined;

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

  @TypeGraphQL.Field(_type => [PostUpdateWithWhereUniqueWithoutTagsInput], {
    nullable: true
  })
  update?: PostUpdateWithWhereUniqueWithoutTagsInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostUpdateManyWithWhereWithoutTagsInput], {
    nullable: true
  })
  updateMany?: PostUpdateManyWithWhereWithoutTagsInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostScalarWhereInput], {
    nullable: true
  })
  deleteMany?: PostScalarWhereInput[] | undefined;
}
