import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {PostOrderByWithRelationInput} from '../inputs/PostOrderByWithRelationInput'
import {UserOrderByWithRelationInput} from '../inputs/UserOrderByWithRelationInput'
import {SortOrder} from '../../enums/SortOrder'

@TypeGraphQL.InputType('CommentOrderByWithRelationInput', {
  isAbstract: true,
})
export class CommentOrderByWithRelationInput {
  @TypeGraphQL.Field((_type) => SortOrder, {
    nullable: true,
  })
  id?: 'asc' | 'desc' | undefined

  @TypeGraphQL.Field((_type) => SortOrder, {
    nullable: true,
  })
  message?: 'asc' | 'desc' | undefined

  @TypeGraphQL.Field((_type) => PostOrderByWithRelationInput, {
    nullable: true,
  })
  port?: PostOrderByWithRelationInput | undefined

  @TypeGraphQL.Field((_type) => SortOrder, {
    nullable: true,
  })
  postId?: 'asc' | 'desc' | undefined

  @TypeGraphQL.Field((_type) => UserOrderByWithRelationInput, {
    nullable: true,
  })
  author?: UserOrderByWithRelationInput | undefined

  @TypeGraphQL.Field((_type) => SortOrder, {
    nullable: true,
  })
  authorId?: 'asc' | 'desc' | undefined
}
