import * as TypeGraphQL from 'type-graphql'

export enum CommentScalarFieldEnum {
  authorId = 'authorId',
  id = 'id',
  message = 'message',
  postId = 'postId',
}
TypeGraphQL.registerEnumType(CommentScalarFieldEnum, {
  description: undefined,
  name: 'CommentScalarFieldEnum',
})
