import * as TypeGraphQL from 'type-graphql'
import graphqlFields from 'graphql-fields'
import {GraphQLResolveInfo} from 'graphql'
import {GroupByUserArgs} from './args/GroupByUserArgs'
import {User} from '../../../models/User'
import {UserGroupBy} from '../../outputs/UserGroupBy'
import {
  getPrismaFromContext,
  transformCountFieldIntoSelectRelationsCount,
  transformFields,
} from '../../../helpers'

@TypeGraphQL.Resolver((_of) => User)
export class GroupByUserResolver {
  @TypeGraphQL.Query((_returns) => [UserGroupBy], {
    nullable: false,
  })
  async groupByUser(
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Info() info: GraphQLResolveInfo,
    @TypeGraphQL.Args() args: GroupByUserArgs,
  ): Promise<UserGroupBy[]> {
    const {_count, _avg, _sum, _min, _max} = transformFields(graphqlFields(info as any))
    return getPrismaFromContext(ctx).user.groupBy({
      ...args,
      ...Object.fromEntries(
        Object.entries({_avg, _count, _max, _min, _sum}).filter(([_, v]) => v != null),
      ),
    })
  }
}
