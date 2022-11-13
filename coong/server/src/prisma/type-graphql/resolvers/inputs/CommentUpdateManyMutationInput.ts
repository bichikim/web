import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {StringFieldUpdateOperationsInput} from '../inputs/StringFieldUpdateOperationsInput'

@TypeGraphQL.InputType('CommentUpdateManyMutationInput', {
  isAbstract: true,
})
export class CommentUpdateManyMutationInput {
  @TypeGraphQL.Field((_type) => StringFieldUpdateOperationsInput, {
    nullable: true,
  })
  message?: StringFieldUpdateOperationsInput | undefined
}
