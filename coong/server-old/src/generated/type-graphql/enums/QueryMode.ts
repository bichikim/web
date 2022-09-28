import * as TypeGraphQL from 'type-graphql'

export enum QueryMode {
  'default' = 'default',
  insensitive = 'insensitive',
}
TypeGraphQL.registerEnumType(QueryMode, {
  description: undefined,
  name: 'QueryMode',
})
