import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { CommentCreateInput } from "../../../inputs/CommentCreateInput";

@TypeGraphQL.ArgsType()
export class CreateOneCommentArgs {
  @TypeGraphQL.Field(_type => CommentCreateInput, {
    nullable: false
  })
  data!: CommentCreateInput;
}
