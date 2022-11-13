import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {PostUpdateOneRequiredWithoutCommentsNestedInput} from '../inputs/PostUpdateOneRequiredWithoutCommentsNestedInput'
import {StringFieldUpdateOperationsInput} from '../inputs/StringFieldUpdateOperationsInput'
import {UserUpdateOneRequiredWithoutCommentsNestedInput} from '../inputs/UserUpdateOneRequiredWithoutCommentsNestedInput'

@TypeGraphQL.InputType('CommentUpdateInput', {
  isAbstract: true,
})
export class CommentUpdateInput {
  @TypeGraphQL.Field((_type) => StringFieldUpdateOperationsInput, {
    nullable: true,
  })
  message?: StringFieldUpdateOperationsInput | undefined

  @TypeGraphQL.Field((_type) => PostUpdateOneRequiredWithoutCommentsNestedInput, {
    nullable: true,
  })
  port?: PostUpdateOneRequiredWithoutCommentsNestedInput | undefined

  @TypeGraphQL.Field((_type) => UserUpdateOneRequiredWithoutCommentsNestedInput, {
    nullable: true,
  })
  author?: UserUpdateOneRequiredWithoutCommentsNestedInput | undefined
}
