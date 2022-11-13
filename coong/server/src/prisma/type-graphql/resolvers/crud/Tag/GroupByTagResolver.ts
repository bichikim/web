import * as TypeGraphQL from 'type-graphql'
import graphqlFields from 'graphql-fields'
import {GraphQLResolveInfo} from 'graphql'
import {GroupByTagArgs} from './args/GroupByTagArgs'
import {Tag} from '../../../models/Tag'
import {TagGroupBy} from '../../outputs/TagGroupBy'
import {
  getPrismaFromContext,
  transformCountFieldIntoSelectRelationsCount,
  transformFields,
} from '../../../helpers'

@TypeGraphQL.Resolver((_of) => Tag)
export class GroupByTagResolver {
  @TypeGraphQL.Query((_returns) => [TagGroupBy], {
    nullable: false,
  })
  async groupByTag(
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Info() info: GraphQLResolveInfo,
    @TypeGraphQL.Args() args: GroupByTagArgs,
  ): Promise<TagGroupBy[]> {
    const {_count, _avg, _sum, _min, _max} = transformFields(graphqlFields(info as any))
    return getPrismaFromContext(ctx).tag.groupBy({
      ...args,
      ...Object.fromEntries(
        Object.entries({_avg, _count, _max, _min, _sum}).filter(([_, v]) => v != null),
      ),
    })
  }
}
