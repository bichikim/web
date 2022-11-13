import * as TypeGraphQL from 'type-graphql'

export enum PostScalarFieldEnum {
  authorId = 'authorId',
  id = 'id',
  likeIDs = 'likeIDs',
  message = 'message',
  tagIDs = 'tagIDs',
  title = 'title',
}
TypeGraphQL.registerEnumType(PostScalarFieldEnum, {
  description: undefined,
  name: 'PostScalarFieldEnum',
})
