import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {CommentCreateManyAuthorInput} from '../inputs/CommentCreateManyAuthorInput'

@TypeGraphQL.InputType('CommentCreateManyAuthorInputEnvelope', {
  isAbstract: true,
})
export class CommentCreateManyAuthorInputEnvelope {
  @TypeGraphQL.Field((_type) => [CommentCreateManyAuthorInput], {
    nullable: false,
  })
  data!: CommentCreateManyAuthorInput[]
}
