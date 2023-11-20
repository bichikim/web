import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { UserCreateNestedOneWithoutCommentsInput } from "../inputs/UserCreateNestedOneWithoutCommentsInput";

@TypeGraphQL.InputType("CommentCreateWithoutPortInput", {})
export class CommentCreateWithoutPortInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  id?: string | undefined;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  message!: string;

  @TypeGraphQL.Field(_type => UserCreateNestedOneWithoutCommentsInput, {
    nullable: false
  })
  author!: UserCreateNestedOneWithoutCommentsInput;
}
