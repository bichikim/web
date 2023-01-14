import {GraphQLResolveInfo} from 'graphql'
import graphqlFields from 'graphql-fields'
import {
  transformCountFieldIntoSelectRelationsCount,
  transformInfoIntoPrismaArgs,
} from 'src/prisma/type-graphql/helpers'

export const getIncludes = (info: GraphQLResolveInfo) => {
  const {_count} = transformInfoIntoPrismaArgs(graphqlFields(info))
  return _count && transformCountFieldIntoSelectRelationsCount(_count)
}
