import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { CommentCreateManyPortInputEnvelope } from "../inputs/CommentCreateManyPortInputEnvelope";
import { CommentCreateOrConnectWithoutPortInput } from "../inputs/CommentCreateOrConnectWithoutPortInput";
import { CommentCreateWithoutPortInput } from "../inputs/CommentCreateWithoutPortInput";
import { CommentWhereUniqueInput } from "../inputs/CommentWhereUniqueInput";

@TypeGraphQL.InputType("CommentCreateNestedManyWithoutPortInput", {})
export class CommentCreateNestedManyWithoutPortInput {
  @TypeGraphQL.Field(_type => [CommentCreateWithoutPortInput], {
    nullable: true
  })
  create?: CommentCreateWithoutPortInput[] | undefined;

  @TypeGraphQL.Field(_type => [CommentCreateOrConnectWithoutPortInput], {
    nullable: true
  })
  connectOrCreate?: CommentCreateOrConnectWithoutPortInput[] | undefined;

  @TypeGraphQL.Field(_type => CommentCreateManyPortInputEnvelope, {
    nullable: true
  })
  createMany?: CommentCreateManyPortInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [CommentWhereUniqueInput], {
    nullable: true
  })
  connect?: CommentWhereUniqueInput[] | undefined;
}
