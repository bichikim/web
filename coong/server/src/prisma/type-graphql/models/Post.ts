import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../scalars'
import {Comment} from '../models/Comment'
import {Tag} from '../models/Tag'
import {User} from '../models/User'
import {PostCount} from '../resolvers/outputs/PostCount'

@TypeGraphQL.ObjectType('Post', {
  isAbstract: true,
})
export class Post {
  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  id!: string

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  title!: string

  @TypeGraphQL.Field((_type) => String, {
    nullable: true,
  })
  message?: string | null

  author?: User

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  authorId!: string

  likes?: User[]

  @TypeGraphQL.Field((_type) => [String], {
    nullable: false,
  })
  likeIDs!: string[]

  tags?: Tag[]

  @TypeGraphQL.Field((_type) => [String], {
    nullable: false,
  })
  tagIDs!: string[]

  comments?: Comment[]

  @TypeGraphQL.Field((_type) => PostCount, {
    nullable: true,
  })
  _count?: PostCount | null
}
