import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentCreateManyAuthorInputEnvelope } from "../inputs/CommentCreateManyAuthorInputEnvelope";
import { CommentCreateOrConnectWithoutAuthorInput } from "../inputs/CommentCreateOrConnectWithoutAuthorInput";
import { CommentCreateWithoutAuthorInput } from "../inputs/CommentCreateWithoutAuthorInput";
import { CommentWhereUniqueInput } from "../inputs/CommentWhereUniqueInput";

@TypeGraphQL.InputType("CommentCreateNestedManyWithoutAuthorInput", {})
export class CommentCreateNestedManyWithoutAuthorInput {
  @TypeGraphQL.Field(_type => [CommentCreateWithoutAuthorInput], {
    nullable: true
  })
  create?: CommentCreateWithoutAuthorInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentCreateOrConnectWithoutAuthorInput], {
    nullable: true
  })
  connectOrCreate?: CommentCreateOrConnectWithoutAuthorInput[] | undefined;

  @TypeGraphQL.Field(_type => CommentCreateManyAuthorInputEnvelope, {
    nullable: true
  })
  createMany?: CommentCreateManyAuthorInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [CommentWhereUniqueInput], {
    nullable: true
  })
  connect?: CommentWhereUniqueInput[] | undefined;
}
