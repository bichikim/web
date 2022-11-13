import * as TypeGraphQL from 'type-graphql'
import * as GraphQLScalars from 'graphql-scalars'
import {Prisma} from '@prisma/client'
import {DecimalJSScalar} from '../../scalars'
import {CommentCreateManyPortInputEnvelope} from '../inputs/CommentCreateManyPortInputEnvelope'
import {CommentCreateOrConnectWithoutPortInput} from '../inputs/CommentCreateOrConnectWithoutPortInput'
import {CommentCreateWithoutPortInput} from '../inputs/CommentCreateWithoutPortInput'
import {CommentScalarWhereInput} from '../inputs/CommentScalarWhereInput'
import {CommentUpdateManyWithWhereWithoutPortInput} from '../inputs/CommentUpdateManyWithWhereWithoutPortInput'
import {CommentUpdateWithWhereUniqueWithoutPortInput} from '../inputs/CommentUpdateWithWhereUniqueWithoutPortInput'
import {CommentUpsertWithWhereUniqueWithoutPortInput} from '../inputs/CommentUpsertWithWhereUniqueWithoutPortInput'
import {CommentWhereUniqueInput} from '../inputs/CommentWhereUniqueInput'

@TypeGraphQL.InputType('CommentUpdateManyWithoutPortNestedInput', {
  isAbstract: true,
})
export class CommentUpdateManyWithoutPortNestedInput {
  @TypeGraphQL.Field((_type) => [CommentCreateWithoutPortInput], {
    nullable: true,
  })
  create?: CommentCreateWithoutPortInput[] | undefined

  @TypeGraphQL.Field((_type) => [CommentCreateOrConnectWithoutPortInput], {
    nullable: true,
  })
  connectOrCreate?: CommentCreateOrConnectWithoutPortInput[] | undefined

  @TypeGraphQL.Field((_type) => [CommentUpsertWithWhereUniqueWithoutPortInput], {
    nullable: true,
  })
  upsert?: CommentUpsertWithWhereUniqueWithoutPortInput[] | undefined

  @TypeGraphQL.Field((_type) => CommentCreateManyPortInputEnvelope, {
    nullable: true,
  })
  createMany?: CommentCreateManyPortInputEnvelope | undefined

  @TypeGraphQL.Field((_type) => [CommentWhereUniqueInput], {
    nullable: true,
  })
  set?: CommentWhereUniqueInput[] | undefined

  @TypeGraphQL.Field((_type) => [CommentWhereUniqueInput], {
    nullable: true,
  })
  disconnect?: CommentWhereUniqueInput[] | undefined

  @TypeGraphQL.Field((_type) => [CommentWhereUniqueInput], {
    nullable: true,
  })
  delete?: CommentWhereUniqueInput[] | undefined

  @TypeGraphQL.Field((_type) => [CommentWhereUniqueInput], {
    nullable: true,
  })
  connect?: CommentWhereUniqueInput[] | undefined

  @TypeGraphQL.Field((_type) => [CommentUpdateWithWhereUniqueWithoutPortInput], {
    nullable: true,
  })
  update?: CommentUpdateWithWhereUniqueWithoutPortInput[] | undefined

  @TypeGraphQL.Field((_type) => [CommentUpdateManyWithWhereWithoutPortInput], {
    nullable: true,
  })
  updateMany?: CommentUpdateManyWithWhereWithoutPortInput[] | undefined

  @TypeGraphQL.Field((_type) => [CommentScalarWhereInput], {
    nullable: true,
  })
  deleteMany?: CommentScalarWhereInput[] | undefined
}
