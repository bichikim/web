import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../scalars'
import {Post} from '../models/Post'
import {User} from '../models/User'

@TypeGraphQL.ObjectType('Comment', {
  isAbstract: true,
})
export class Comment {
  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  id!: string

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  message!: string

  port?: Post

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  postId!: string

  author?: User

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  authorId!: string
}
