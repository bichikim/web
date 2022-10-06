import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { PostCreateOrConnectWithoutTagsInput } from "../inputs/PostCreateOrConnectWithoutTagsInput";
import { PostCreateWithoutTagsInput } from "../inputs/PostCreateWithoutTagsInput";
import { PostWhereUniqueInput } from "../inputs/PostWhereUniqueInput";

@TypeGraphQL.InputType("PostCreateNestedManyWithoutTagsInput", {
  isAbstract: true
})
export class PostCreateNestedManyWithoutTagsInput {
  @TypeGraphQL.Field(_type => [PostCreateWithoutTagsInput], {
    nullable: true
  })
  create?: PostCreateWithoutTagsInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostCreateOrConnectWithoutTagsInput], {
    nullable: true
  })
  connectOrCreate?: PostCreateOrConnectWithoutTagsInput[] | undefined;

  @TypeGraphQL.Field(_type => [PostWhereUniqueInput], {
    nullable: true
  })
  connect?: PostWhereUniqueInput[] | undefined;
}
