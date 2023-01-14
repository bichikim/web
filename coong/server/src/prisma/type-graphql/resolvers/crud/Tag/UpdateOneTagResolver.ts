import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { UpdateOneTagArgs } from "./args/UpdateOneTagArgs";
import { Tag } from "../../../models/Tag";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Tag)
export class UpdateOneTagResolver {
  @TypeGraphQL.Mutation(_returns => Tag, {
    nullable: true
  })
  async updateOneTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateOneTagArgs): Promise<Tag | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.update({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
