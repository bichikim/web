import * as TypeGraphQL from 'type-graphql'

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}
TypeGraphQL.registerEnumType(SortOrder, {
  description: undefined,
  name: 'SortOrder',
})
