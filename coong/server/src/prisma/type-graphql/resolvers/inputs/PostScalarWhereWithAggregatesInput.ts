import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {StringNullableListFilter} from '../inputs/StringNullableListFilter'
import {StringNullableWithAggregatesFilter} from '../inputs/StringNullableWithAggregatesFilter'
import {StringWithAggregatesFilter} from '../inputs/StringWithAggregatesFilter'

@TypeGraphQL.InputType('PostScalarWhereWithAggregatesInput', {
  isAbstract: true,
})
export class PostScalarWhereWithAggregatesInput {
  @TypeGraphQL.Field((_type) => [PostScalarWhereWithAggregatesInput], {
    nullable: true,
  })
  AND?: PostScalarWhereWithAggregatesInput[] | undefined

  @TypeGraphQL.Field((_type) => [PostScalarWhereWithAggregatesInput], {
    nullable: true,
  })
  OR?: PostScalarWhereWithAggregatesInput[] | undefined

  @TypeGraphQL.Field((_type) => [PostScalarWhereWithAggregatesInput], {
    nullable: true,
  })
  NOT?: PostScalarWhereWithAggregatesInput[] | undefined

  @TypeGraphQL.Field((_type) => StringWithAggregatesFilter, {
    nullable: true,
  })
  id?: StringWithAggregatesFilter | undefined

  @TypeGraphQL.Field((_type) => StringWithAggregatesFilter, {
    nullable: true,
  })
  title?: StringWithAggregatesFilter | undefined

  @TypeGraphQL.Field((_type) => StringNullableWithAggregatesFilter, {
    nullable: true,
  })
  message?: StringNullableWithAggregatesFilter | undefined

  @TypeGraphQL.Field((_type) => StringWithAggregatesFilter, {
    nullable: true,
  })
  authorId?: StringWithAggregatesFilter | undefined

  @TypeGraphQL.Field((_type) => StringNullableListFilter, {
    nullable: true,
  })
  likeIDs?: StringNullableListFilter | undefined

  @TypeGraphQL.Field((_type) => StringNullableListFilter, {
    nullable: true,
  })
  tagIDs?: StringNullableListFilter | undefined
}
