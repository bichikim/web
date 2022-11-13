import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {CommentCountAggregate} from '../outputs/CommentCountAggregate'
import {CommentMaxAggregate} from '../outputs/CommentMaxAggregate'
import {CommentMinAggregate} from '../outputs/CommentMinAggregate'

@TypeGraphQL.ObjectType('CommentGroupBy', {
  isAbstract: true,
})
export class CommentGroupBy {
  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  id!: string

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  message!: string

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  postId!: string

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  authorId!: string

  @TypeGraphQL.Field((_type) => CommentCountAggregate, {
    nullable: true,
  })
  _count!: CommentCountAggregate | null

  @TypeGraphQL.Field((_type) => CommentMinAggregate, {
    nullable: true,
  })
  _min!: CommentMinAggregate | null

  @TypeGraphQL.Field((_type) => CommentMaxAggregate, {
    nullable: true,
  })
  _max!: CommentMaxAggregate | null
}
