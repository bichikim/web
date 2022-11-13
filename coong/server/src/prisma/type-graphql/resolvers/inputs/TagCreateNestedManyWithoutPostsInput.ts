import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {TagCreateOrConnectWithoutPostsInput} from '../inputs/TagCreateOrConnectWithoutPostsInput'
import {TagCreateWithoutPostsInput} from '../inputs/TagCreateWithoutPostsInput'
import {TagWhereUniqueInput} from '../inputs/TagWhereUniqueInput'

@TypeGraphQL.InputType('TagCreateNestedManyWithoutPostsInput', {
  isAbstract: true,
})
export class TagCreateNestedManyWithoutPostsInput {
  @TypeGraphQL.Field((_type) => [TagCreateWithoutPostsInput], {
    nullable: true,
  })
  create?: TagCreateWithoutPostsInput[] | undefined

  @TypeGraphQL.Field((_type) => [TagCreateOrConnectWithoutPostsInput], {
    nullable: true,
  })
  connectOrCreate?: TagCreateOrConnectWithoutPostsInput[] | undefined

  @TypeGraphQL.Field((_type) => [TagWhereUniqueInput], {
    nullable: true,
  })
  connect?: TagWhereUniqueInput[] | undefined
}
