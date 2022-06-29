import {GraphQLResolveInfo} from 'graphql'
import graphqlFields from 'graphql-fields'
import {
  transformCountFieldIntoSelectRelationsCount,
  transformFields,
} from 'src/generated/type-graphql/helpers'

export const getIncludes = (info: GraphQLResolveInfo) => {
  const {_count} = transformFields(graphqlFields(info))
  return _count && transformCountFieldIntoSelectRelationsCount(_count)
}
