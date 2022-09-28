import * as TypeGraphQL from 'type-graphql'

export enum PostScalarFieldEnum {
  authorId = 'authorId',
  id = 'id',
  likeIDs = 'likeIDs',
  title = 'title',
}
TypeGraphQL.registerEnumType(PostScalarFieldEnum, {
  description: undefined,
  name: 'PostScalarFieldEnum',
})
