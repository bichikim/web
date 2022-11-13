import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {PostUpdateManyWithoutTagsNestedInput} from '../inputs/PostUpdateManyWithoutTagsNestedInput'
import {StringFieldUpdateOperationsInput} from '../inputs/StringFieldUpdateOperationsInput'
import {TagUpdatepostIDsInput} from '../inputs/TagUpdatepostIDsInput'

@TypeGraphQL.InputType('TagUpdateInput', {
  isAbstract: true,
})
export class TagUpdateInput {
  @TypeGraphQL.Field((_type) => StringFieldUpdateOperationsInput, {
    nullable: true,
  })
  name?: StringFieldUpdateOperationsInput | undefined

  @TypeGraphQL.Field((_type) => PostUpdateManyWithoutTagsNestedInput, {
    nullable: true,
  })
  posts?: PostUpdateManyWithoutTagsNestedInput | undefined

  @TypeGraphQL.Field((_type) => TagUpdatepostIDsInput, {
    nullable: true,
  })
  postIDs?: TagUpdatepostIDsInput | undefined
}
