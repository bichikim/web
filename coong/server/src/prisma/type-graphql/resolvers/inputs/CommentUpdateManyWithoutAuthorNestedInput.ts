import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentCreateManyAuthorInputEnvelope } from "../inputs/CommentCreateManyAuthorInputEnvelope";
import { CommentCreateOrConnectWithoutAuthorInput } from "../inputs/CommentCreateOrConnectWithoutAuthorInput";
import { CommentCreateWithoutAuthorInput } from "../inputs/CommentCreateWithoutAuthorInput";
import { CommentScalarWhereInput } from "../inputs/CommentScalarWhereInput";
import { CommentUpdateManyWithWhereWithoutAuthorInput } from "../inputs/CommentUpdateManyWithWhereWithoutAuthorInput";
import { CommentUpdateWithWhereUniqueWithoutAuthorInput } from "../inputs/CommentUpdateWithWhereUniqueWithoutAuthorInput";
import { CommentUpsertWithWhereUniqueWithoutAuthorInput } from "../inputs/CommentUpsertWithWhereUniqueWithoutAuthorInput";
import { CommentWhereUniqueInput } from "../inputs/CommentWhereUniqueInput";

@TypeGraphQL.InputType("CommentUpdateManyWithoutAuthorNestedInput", {})
export class CommentUpdateManyWithoutAuthorNestedInput {
  @TypeGraphQL.Field(_type => [CommentCreateWithoutAuthorInput], {
    nullable: true
  })
  create?: CommentCreateWithoutAuthorInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentCreateOrConnectWithoutAuthorInput], {
    nullable: true
  })
  connectOrCreate?: CommentCreateOrConnectWithoutAuthorInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentUpsertWithWhereUniqueWithoutAuthorInput], {
    nullable: true
  })
  upsert?: CommentUpsertWithWhereUniqueWithoutAuthorInput[] | undefined;

  @TypeGraphQL.Field(_type => CommentCreateManyAuthorInputEnvelope, {
    nullable: true
  })
  createMany?: CommentCreateManyAuthorInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [CommentWhereUniqueInput], {
    nullable: true
  })
  set?: CommentWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentWhereUniqueInput], {
    nullable: true
  })
  disconnect?: CommentWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentWhereUniqueInput], {
    nullable: true
  })
  delete?: CommentWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentWhereUniqueInput], {
    nullable: true
  })
  connect?: CommentWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentUpdateWithWhereUniqueWithoutAuthorInput], {
    nullable: true
  })
  update?: CommentUpdateWithWhereUniqueWithoutAuthorInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentUpdateManyWithWhereWithoutAuthorInput], {
    nullable: true
  })
  updateMany?: CommentUpdateManyWithWhereWithoutAuthorInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentScalarWhereInput], {
    nullable: true
  })
  deleteMany?: CommentScalarWhereInput[] | undefined;
}
