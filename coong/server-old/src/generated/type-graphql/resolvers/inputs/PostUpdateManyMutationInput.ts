import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {PostUpdatelikeIDsInput} from '../inputs/PostUpdatelikeIDsInput'
import {StringFieldUpdateOperationsInput} from '../inputs/StringFieldUpdateOperationsInput'

@TypeGraphQL.InputType('PostUpdateManyMutationInput', {
  isAbstract: true,
})
export class PostUpdateManyMutationInput {
  @TypeGraphQL.Field((_type) => StringFieldUpdateOperationsInput, {
    nullable: true,
  })
  title?: StringFieldUpdateOperationsInput | undefined

  @TypeGraphQL.Field((_type) => PostUpdatelikeIDsInput, {
    nullable: true,
  })
  likeIDs?: PostUpdatelikeIDsInput | undefined
}
