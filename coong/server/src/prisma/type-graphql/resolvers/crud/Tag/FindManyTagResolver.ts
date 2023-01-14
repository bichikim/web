import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindManyTagArgs } from "./args/FindManyTagArgs";
import { Tag } from "../../../models/Tag";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Tag)
export class FindManyTagResolver {
  @TypeGraphQL.Query(_returns => [Tag], {
    nullable: false
  })
  async tags(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindManyTagArgs): Promise<Tag[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.findMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
