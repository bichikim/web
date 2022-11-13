import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {CommentCreateWithoutPortInput} from '../inputs/CommentCreateWithoutPortInput'
import {CommentUpdateWithoutPortInput} from '../inputs/CommentUpdateWithoutPortInput'
import {CommentWhereUniqueInput} from '../inputs/CommentWhereUniqueInput'

@TypeGraphQL.InputType('CommentUpsertWithWhereUniqueWithoutPortInput', {
  isAbstract: true,
})
export class CommentUpsertWithWhereUniqueWithoutPortInput {
  @TypeGraphQL.Field((_type) => CommentWhereUniqueInput, {
    nullable: false,
  })
  where!: CommentWhereUniqueInput

  @TypeGraphQL.Field((_type) => CommentUpdateWithoutPortInput, {
    nullable: false,
  })
  update!: CommentUpdateWithoutPortInput

  @TypeGraphQL.Field((_type) => CommentCreateWithoutPortInput, {
    nullable: false,
  })
  create!: CommentCreateWithoutPortInput
}
