import * as TypeGraphQL from "type-graphql";
import graphqlFields from "graphql-fields";
import { GraphQLResolveInfo } from "graphql";
import { AggregateTagArgs } from "./args/AggregateTagArgs";
import { Tag } from "../../../models/Tag";
import { AggregateTag } from "../../outputs/AggregateTag";
import { transformFields, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Tag)
export class AggregateTagResolver {
  @TypeGraphQL.Query(_returns => AggregateTag, {
    nullable: false
  })
  async aggregateTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateTagArgs): Promise<AggregateTag> {
    return getPrismaFromContext(ctx).tag.aggregate({
      ...args,
      ...transformFields(graphqlFields(info as any)),
    });
  }
}
