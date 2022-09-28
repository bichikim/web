import * as TypeGraphQL from 'type-graphql'
import graphqlFields from 'graphql-fields'
import {GraphQLResolveInfo} from 'graphql'
import {GroupByPostArgs} from './args/GroupByPostArgs'
import {Post} from '../../../models/Post'
import {PostGroupBy} from '../../outputs/PostGroupBy'
import {
  getPrismaFromContext,
  transformCountFieldIntoSelectRelationsCount,
  transformFields,
} from '../../../helpers'

@TypeGraphQL.Resolver((_of) => Post)
export class GroupByPostResolver {
  @TypeGraphQL.Query((_returns) => [PostGroupBy], {
    nullable: false,
  })
  async groupByPost(
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Info() info: GraphQLResolveInfo,
    @TypeGraphQL.Args() args: GroupByPostArgs,
  ): Promise<PostGroupBy[]> {
    const {_count, _avg, _sum, _min, _max} = transformFields(graphqlFields(info as any))
    return getPrismaFromContext(ctx).post.groupBy({
      ...args,
      ...Object.fromEntries(
        Object.entries({_avg, _count, _max, _min, _sum}).filter(([_, v]) => v != null),
      ),
    })
  }
}
