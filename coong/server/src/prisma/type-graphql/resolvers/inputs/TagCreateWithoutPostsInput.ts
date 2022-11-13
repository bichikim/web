import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {TagCreatepostIDsInput} from '../inputs/TagCreatepostIDsInput'

@TypeGraphQL.InputType('TagCreateWithoutPostsInput', {
  isAbstract: true,
})
export class TagCreateWithoutPostsInput {
  @TypeGraphQL.Field((_type) => String, {
    nullable: true,
  })
  id?: string | undefined

  @TypeGraphQL.Field((_type) => String, {
    nullable: false,
  })
  name!: string

  @TypeGraphQL.Field((_type) => TagCreatepostIDsInput, {
    nullable: true,
  })
  postIDs?: TagCreatepostIDsInput | undefined
}
