import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { DeleteOneTagArgs } from "./args/DeleteOneTagArgs";
import { Tag } from "../../../models/Tag";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Tag)
export class DeleteOneTagResolver {
  @TypeGraphQL.Mutation(_returns => Tag, {
    nullable: true
  })
  async deleteOneTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteOneTagArgs): Promise<Tag | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.delete({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
