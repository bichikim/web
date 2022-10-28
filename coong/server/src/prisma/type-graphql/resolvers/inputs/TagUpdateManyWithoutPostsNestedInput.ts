import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { TagCreateOrConnectWithoutPostsInput } from "../inputs/TagCreateOrConnectWithoutPostsInput";
import { TagCreateWithoutPostsInput } from "../inputs/TagCreateWithoutPostsInput";
import { TagScalarWhereInput } from "../inputs/TagScalarWhereInput";
import { TagUpdateManyWithWhereWithoutPostsInput } from "../inputs/TagUpdateManyWithWhereWithoutPostsInput";
import { TagUpdateWithWhereUniqueWithoutPostsInput } from "../inputs/TagUpdateWithWhereUniqueWithoutPostsInput";
import { TagUpsertWithWhereUniqueWithoutPostsInput } from "../inputs/TagUpsertWithWhereUniqueWithoutPostsInput";
import { TagWhereUniqueInput } from "../inputs/TagWhereUniqueInput";

@TypeGraphQL.InputType("TagUpdateManyWithoutPostsNestedInput", {
  isAbstract: true
})
export class TagUpdateManyWithoutPostsNestedInput {
  @TypeGraphQL.Field(_type => [TagCreateWithoutPostsInput], {
    nullable: true
  })
  create?: TagCreateWithoutPostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagCreateOrConnectWithoutPostsInput], {
    nullable: true
  })
  connectOrCreate?: TagCreateOrConnectWithoutPostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagUpsertWithWhereUniqueWithoutPostsInput], {
    nullable: true
  })
  upsert?: TagUpsertWithWhereUniqueWithoutPostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagWhereUniqueInput], {
    nullable: true
  })
  set?: TagWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagWhereUniqueInput], {
    nullable: true
  })
  disconnect?: TagWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagWhereUniqueInput], {
    nullable: true
  })
  delete?: TagWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagWhereUniqueInput], {
    nullable: true
  })
  connect?: TagWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagUpdateWithWhereUniqueWithoutPostsInput], {
    nullable: true
  })
  update?: TagUpdateWithWhereUniqueWithoutPostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagUpdateManyWithWhereWithoutPostsInput], {
    nullable: true
  })
  updateMany?: TagUpdateManyWithWhereWithoutPostsInput[] | undefined;

  @TypeGraphQL.Field(_type => [TagScalarWhereInput], {
    nullable: true
  })
  deleteMany?: TagScalarWhereInput[] | undefined;
}
