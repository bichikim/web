import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {CommentCreateWithoutPortInput} from '../inputs/CommentCreateWithoutPortInput'
import {CommentWhereUniqueInput} from '../inputs/CommentWhereUniqueInput'

@TypeGraphQL.InputType('CommentCreateOrConnectWithoutPortInput', {
  isAbstract: true,
})
export class CommentCreateOrConnectWithoutPortInput {
  @TypeGraphQL.Field((_type) => CommentWhereUniqueInput, {
    nullable: false,
  })
  where!: CommentWhereUniqueInput

  @TypeGraphQL.Field((_type) => CommentCreateWithoutPortInput, {
    nullable: false,
  })
  create!: CommentCreateWithoutPortInput
}
