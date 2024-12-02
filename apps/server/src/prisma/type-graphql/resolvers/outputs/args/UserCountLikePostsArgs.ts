import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { PostWhereInput } from "../../inputs/PostWhereInput";

@TypeGraphQL.ArgsType()
export class UserCountLikePostsArgs {
  @TypeGraphQL.Field(_type => PostWhereInput, {
    nullable: true
  })
  where?: PostWhereInput | undefined;
}
