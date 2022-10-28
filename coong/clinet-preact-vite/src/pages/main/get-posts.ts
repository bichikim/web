import {gql} from '@ts-gql/tag'

export const getPosts = gql`
  query getPosts(
    $skip: Int
    $take: Int
    $orderBy: [PostOrderByWithRelationInput!]
    $cursor: PostWhereUniqueInput
  ) {
    posts(skip: $skip, take: $take, orderBy: $orderBy, cursor: $cursor) {
      id
      title
      message
    }
  }
` as import('../../../__generated__/ts-gql/getPosts').type
