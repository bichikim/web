import {ClassType} from 'type-graphql'
import * as tslib from 'tslib'
import * as crudResolvers from './resolvers/crud/resolvers-crud.index'
import * as argsTypes from './resolvers/crud/args.index'
import * as actionResolvers from './resolvers/crud/resolvers-actions.index'
import * as relationResolvers from './resolvers/relations/resolvers.index'
import * as models from './models'
import * as outputTypes from './resolvers/outputs'
import * as inputTypes from './resolvers/inputs'

const crudResolversMap = {
  Post: crudResolvers.PostCrudResolver,
  User: crudResolvers.UserCrudResolver,
}
const actionResolversMap = {
  Post: {
    aggregatePost: actionResolvers.AggregatePostResolver,
    createManyPost: actionResolvers.CreateManyPostResolver,
    createPost: actionResolvers.CreatePostResolver,
    deleteManyPost: actionResolvers.DeleteManyPostResolver,
    deletePost: actionResolvers.DeletePostResolver,
    findFirstPost: actionResolvers.FindFirstPostResolver,
    groupByPost: actionResolvers.GroupByPostResolver,
    post: actionResolvers.FindUniquePostResolver,
    posts: actionResolvers.FindManyPostResolver,
    updateManyPost: actionResolvers.UpdateManyPostResolver,
    updatePost: actionResolvers.UpdatePostResolver,
    upsertPost: actionResolvers.UpsertPostResolver,
  },
  User: {
    aggregateUser: actionResolvers.AggregateUserResolver,
    createManyUser: actionResolvers.CreateManyUserResolver,
    createUser: actionResolvers.CreateUserResolver,
    deleteManyUser: actionResolvers.DeleteManyUserResolver,
    deleteUser: actionResolvers.DeleteUserResolver,
    findFirstUser: actionResolvers.FindFirstUserResolver,
    groupByUser: actionResolvers.GroupByUserResolver,
    updateManyUser: actionResolvers.UpdateManyUserResolver,
    updateUser: actionResolvers.UpdateUserResolver,
    upsertUser: actionResolvers.UpsertUserResolver,
    user: actionResolvers.FindUniqueUserResolver,
    users: actionResolvers.FindManyUserResolver,
  },
}
const crudResolversInfo = {
  Post: [
    'post',
    'findFirstPost',
    'posts',
    'createPost',
    'createManyPost',
    'deletePost',
    'updatePost',
    'deleteManyPost',
    'updateManyPost',
    'upsertPost',
    'aggregatePost',
    'groupByPost',
  ],
  User: [
    'user',
    'findFirstUser',
    'users',
    'createUser',
    'createManyUser',
    'deleteUser',
    'updateUser',
    'deleteManyUser',
    'updateManyUser',
    'upsertUser',
    'aggregateUser',
    'groupByUser',
  ],
}
const argsInfo = {
  AggregatePostArgs: ['where', 'orderBy', 'cursor', 'take', 'skip'],
  AggregateUserArgs: ['where', 'orderBy', 'cursor', 'take', 'skip'],
  CreateManyPostArgs: ['data'],
  CreateManyUserArgs: ['data'],
  CreatePostArgs: ['data'],
  CreateUserArgs: ['data'],
  DeleteManyPostArgs: ['where'],
  DeleteManyUserArgs: ['where'],
  DeletePostArgs: ['where'],
  DeleteUserArgs: ['where'],
  FindFirstPostArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindFirstUserArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindManyPostArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindManyUserArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindUniquePostArgs: ['where'],
  FindUniqueUserArgs: ['where'],
  GroupByPostArgs: ['where', 'orderBy', 'by', 'having', 'take', 'skip'],
  GroupByUserArgs: ['where', 'orderBy', 'by', 'having', 'take', 'skip'],
  UpdateManyPostArgs: ['data', 'where'],
  UpdateManyUserArgs: ['data', 'where'],
  UpdatePostArgs: ['data', 'where'],
  UpdateUserArgs: ['data', 'where'],
  UpsertPostArgs: ['where', 'create', 'update'],
  UpsertUserArgs: ['where', 'create', 'update'],
}

type ResolverModelNames = keyof typeof crudResolversMap

type ModelResolverActionNames<TModel extends ResolverModelNames> =
  keyof typeof crudResolversMap[TModel]['prototype']

export type ResolverActionsConfig<TModel extends ResolverModelNames> = Partial<
  Record<ModelResolverActionNames<TModel> | '_all', MethodDecorator[]>
>

export type ResolversEnhanceMap = {
  [TModel in ResolverModelNames]?: ResolverActionsConfig<TModel>
}

export function applyResolversEnhanceMap(resolversEnhanceMap: ResolversEnhanceMap) {
  for (const resolversEnhanceMapKey of Object.keys(resolversEnhanceMap)) {
    const modelName = resolversEnhanceMapKey as keyof typeof resolversEnhanceMap
    const crudTarget = crudResolversMap[modelName].prototype
    const resolverActionsConfig = resolversEnhanceMap[modelName]!
    const actionResolversConfig = actionResolversMap[modelName]
    if (resolverActionsConfig._all) {
      const allActionsDecorators = resolverActionsConfig._all
      const resolverActionNames = crudResolversInfo[modelName as keyof typeof crudResolversInfo]
      for (const resolverActionName of resolverActionNames) {
        const actionTarget = (
          actionResolversConfig[
            resolverActionName as keyof typeof actionResolversConfig
          ] as Function
        ).prototype
        tslib.__decorate(allActionsDecorators, crudTarget, resolverActionName, null)
        tslib.__decorate(allActionsDecorators, actionTarget, resolverActionName, null)
      }
    }
    const resolverActionsToApply = Object.keys(resolverActionsConfig).filter((it) => it !== '_all')
    for (const resolverActionName of resolverActionsToApply) {
      const decorators = resolverActionsConfig[
        resolverActionName as keyof typeof resolverActionsConfig
      ] as MethodDecorator[]
      const actionTarget = (
        actionResolversConfig[resolverActionName as keyof typeof actionResolversConfig] as Function
      ).prototype
      tslib.__decorate(decorators, crudTarget, resolverActionName, null)
      tslib.__decorate(decorators, actionTarget, resolverActionName, null)
    }
  }
}

type ArgsTypesNames = keyof typeof argsTypes

type ArgFieldNames<TArgsType extends ArgsTypesNames> = Exclude<
  keyof typeof argsTypes[TArgsType]['prototype'],
  number | symbol
>

type ArgFieldsConfig<TArgsType extends ArgsTypesNames> = FieldsConfig<ArgFieldNames<TArgsType>>

export type ArgConfig<TArgsType extends ArgsTypesNames> = {
  class?: ClassDecorator[]
  fields?: ArgFieldsConfig<TArgsType>
}

export type ArgsTypesEnhanceMap = {
  [TArgsType in ArgsTypesNames]?: ArgConfig<TArgsType>
}

export function applyArgsTypesEnhanceMap(argsTypesEnhanceMap: ArgsTypesEnhanceMap) {
  for (const argsTypesEnhanceMapKey of Object.keys(argsTypesEnhanceMap)) {
    const argsTypeName = argsTypesEnhanceMapKey as keyof typeof argsTypesEnhanceMap
    const typeConfig = argsTypesEnhanceMap[argsTypeName]!
    const typeClass = argsTypes[argsTypeName]
    const typeTarget = typeClass.prototype
    applyTypeClassEnhanceConfig(
      typeConfig,
      typeClass,
      typeTarget,
      argsInfo[argsTypeName as keyof typeof argsInfo],
    )
  }
}

const relationResolversMap = {
  Post: relationResolvers.PostRelationsResolver,
  User: relationResolvers.UserRelationsResolver,
}
const relationResolversInfo = {
  Post: ['author', 'likes'],
  User: ['followers', 'following', 'likePosts', 'posts'],
}

type RelationResolverModelNames = keyof typeof relationResolversMap

type RelationResolverActionNames<TModel extends RelationResolverModelNames> =
  keyof typeof relationResolversMap[TModel]['prototype']

export type RelationResolverActionsConfig<TModel extends RelationResolverModelNames> = Partial<
  Record<RelationResolverActionNames<TModel> | '_all', MethodDecorator[]>
>

export type RelationResolversEnhanceMap = {
  [TModel in RelationResolverModelNames]?: RelationResolverActionsConfig<TModel>
}

export function applyRelationResolversEnhanceMap(
  relationResolversEnhanceMap: RelationResolversEnhanceMap,
) {
  for (const relationResolversEnhanceMapKey of Object.keys(relationResolversEnhanceMap)) {
    const modelName = relationResolversEnhanceMapKey as keyof typeof relationResolversEnhanceMap
    const relationResolverTarget = relationResolversMap[modelName].prototype
    const relationResolverActionsConfig = relationResolversEnhanceMap[modelName]!
    if (relationResolverActionsConfig._all) {
      const allActionsDecorators = relationResolverActionsConfig._all
      const relationResolverActionNames =
        relationResolversInfo[modelName as keyof typeof relationResolversInfo]
      for (const relationResolverActionName of relationResolverActionNames) {
        tslib.__decorate(
          allActionsDecorators,
          relationResolverTarget,
          relationResolverActionName,
          null,
        )
      }
    }
    const relationResolverActionsToApply = Object.keys(relationResolverActionsConfig).filter(
      (it) => it !== '_all',
    )
    for (const relationResolverActionName of relationResolverActionsToApply) {
      const decorators = relationResolverActionsConfig[
        relationResolverActionName as keyof typeof relationResolverActionsConfig
      ] as MethodDecorator[]
      tslib.__decorate(decorators, relationResolverTarget, relationResolverActionName, null)
    }
  }
}

type TypeConfig = {
  class?: ClassDecorator[]
  fields?: FieldsConfig
}

type FieldsConfig<TTypeKeys extends string = string> = Partial<
  Record<TTypeKeys | '_all', PropertyDecorator[]>
>

function applyTypeClassEnhanceConfig<TEnhanceConfig extends TypeConfig, TType extends object>(
  enhanceConfig: TEnhanceConfig,
  typeClass: ClassType<TType>,
  typePrototype: TType,
  typeFieldNames: string[],
) {
  if (enhanceConfig.class) {
    tslib.__decorate(enhanceConfig.class, typeClass)
  }
  if (enhanceConfig.fields) {
    if (enhanceConfig.fields._all) {
      const allFieldsDecorators = enhanceConfig.fields._all
      for (const typeFieldName of typeFieldNames) {
        tslib.__decorate(allFieldsDecorators, typePrototype, typeFieldName, void 0)
      }
    }
    const configFieldsToApply = Object.keys(enhanceConfig.fields).filter((it) => it !== '_all')
    for (const typeFieldName of configFieldsToApply) {
      const fieldDecorators = enhanceConfig.fields[typeFieldName]!
      tslib.__decorate(fieldDecorators, typePrototype, typeFieldName, void 0)
    }
  }
}

const modelsInfo = {
  Post: ['id', 'title', 'authorId', 'likeIDs'],
  User: ['id', 'email', 'name', 'followerIDs', 'followingIDs', 'likePostIDs'],
}

type ModelNames = keyof typeof models

type ModelFieldNames<TModel extends ModelNames> = Exclude<
  keyof typeof models[TModel]['prototype'],
  number | symbol
>

type ModelFieldsConfig<TModel extends ModelNames> = FieldsConfig<ModelFieldNames<TModel>>

export type ModelConfig<TModel extends ModelNames> = {
  class?: ClassDecorator[]
  fields?: ModelFieldsConfig<TModel>
}

export type ModelsEnhanceMap = {
  [TModel in ModelNames]?: ModelConfig<TModel>
}

export function applyModelsEnhanceMap(modelsEnhanceMap: ModelsEnhanceMap) {
  for (const modelsEnhanceMapKey of Object.keys(modelsEnhanceMap)) {
    const modelName = modelsEnhanceMapKey as keyof typeof modelsEnhanceMap
    const modelConfig = modelsEnhanceMap[modelName]!
    const modelClass = models[modelName]
    const modelTarget = modelClass.prototype
    applyTypeClassEnhanceConfig(
      modelConfig,
      modelClass,
      modelTarget,
      modelsInfo[modelName as keyof typeof modelsInfo],
    )
  }
}

const outputsInfo = {
  AffectedRowsOutput: ['count'],
  AggregatePost: ['_count', '_min', '_max'],
  AggregateUser: ['_count', '_min', '_max'],
  PostCount: ['likes'],
  PostCountAggregate: ['id', 'title', 'authorId', 'likeIDs', '_all'],
  PostGroupBy: ['id', 'title', 'authorId', 'likeIDs', '_count', '_min', '_max'],
  PostMaxAggregate: ['id', 'title', 'authorId'],
  PostMinAggregate: ['id', 'title', 'authorId'],
  UserCount: ['followers', 'following', 'likePosts', 'posts'],
  UserCountAggregate: [
    'id',
    'email',
    'name',
    'password',
    'followerIDs',
    'followingIDs',
    'likePostIDs',
    'roles',
    '_all',
  ],
  UserGroupBy: [
    'id',
    'email',
    'name',
    'password',
    'followerIDs',
    'followingIDs',
    'likePostIDs',
    'roles',
    '_count',
    '_min',
    '_max',
  ],
  UserMaxAggregate: ['id', 'email', 'name', 'password'],
  UserMinAggregate: ['id', 'email', 'name', 'password'],
}

type OutputTypesNames = keyof typeof outputTypes

type OutputTypeFieldNames<TOutput extends OutputTypesNames> = Exclude<
  keyof typeof outputTypes[TOutput]['prototype'],
  number | symbol
>

type OutputTypeFieldsConfig<TOutput extends OutputTypesNames> = FieldsConfig<
  OutputTypeFieldNames<TOutput>
>

export type OutputTypeConfig<TOutput extends OutputTypesNames> = {
  class?: ClassDecorator[]
  fields?: OutputTypeFieldsConfig<TOutput>
}

export type OutputTypesEnhanceMap = {
  [TOutput in OutputTypesNames]?: OutputTypeConfig<TOutput>
}

export function applyOutputTypesEnhanceMap(outputTypesEnhanceMap: OutputTypesEnhanceMap) {
  for (const outputTypeEnhanceMapKey of Object.keys(outputTypesEnhanceMap)) {
    const outputTypeName = outputTypeEnhanceMapKey as keyof typeof outputTypesEnhanceMap
    const typeConfig = outputTypesEnhanceMap[outputTypeName]!
    const typeClass = outputTypes[outputTypeName]
    const typeTarget = typeClass.prototype
    applyTypeClassEnhanceConfig(
      typeConfig,
      typeClass,
      typeTarget,
      outputsInfo[outputTypeName as keyof typeof outputsInfo],
    )
  }
}

const inputsInfo = {
  PostCountOrderByAggregateInput: ['id', 'title', 'authorId', 'likeIDs'],
  PostCreateInput: ['id', 'title', 'author', 'likes', 'likeIDs'],
  PostCreateManyInput: ['id', 'title', 'authorId', 'likeIDs'],
  PostCreateNestedManyWithoutLikesInput: ['create', 'connectOrCreate', 'connect'],
  PostListRelationFilter: ['every', 'some', 'none'],
  PostCreateNestedManyWithoutAuthorInput: ['create', 'connectOrCreate', 'createMany', 'connect'],
  PostMaxOrderByAggregateInput: ['id', 'title', 'authorId'],
  PostMinOrderByAggregateInput: ['id', 'title', 'authorId'],
  PostOrderByRelationAggregateInput: ['_count'],
  NullableStringFieldUpdateOperationsInput: ['set', 'unset'],
  PostOrderByWithAggregationInput: ['id', 'title', 'authorId', 'likeIDs', '_count', '_max', '_min'],
  PostOrderByWithRelationInput: ['id', 'title', 'author', 'authorId', 'likes', 'likeIDs'],
  PostScalarWhereWithAggregatesInput: ['AND', 'OR', 'NOT', 'id', 'title', 'authorId', 'likeIDs'],
  PostUpdateInput: ['title', 'author', 'likes', 'likeIDs'],
  PostUpdateManyMutationInput: ['title', 'likeIDs'],
  PostUpdateManyWithoutAuthorInput: [
    'create',
    'connectOrCreate',
    'upsert',
    'createMany',
    'set',
    'disconnect',
    'delete',
    'connect',
    'update',
    'updateMany',
    'deleteMany',
  ],
  PostUpdateManyWithoutLikesInput: [
    'create',
    'connectOrCreate',
    'upsert',
    'set',
    'disconnect',
    'delete',
    'connect',
    'update',
    'updateMany',
    'deleteMany',
  ],
  PostWhereInput: ['AND', 'OR', 'NOT', 'id', 'title', 'author', 'authorId', 'likes', 'likeIDs'],
  PostWhereUniqueInput: ['id'],
  PostCreatelikeIDsInput: ['set'],
  StringFieldUpdateOperationsInput: ['set'],
  StringFilter: [
    'equals',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'contains',
    'startsWith',
    'endsWith',
    'mode',
    'not',
  ],
  StringNullableFilter: [
    'equals',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'contains',
    'startsWith',
    'endsWith',
    'mode',
    'not',
    'isSet',
  ],
  NestedStringFilter: [
    'equals',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'contains',
    'startsWith',
    'endsWith',
    'not',
  ],
  StringNullableListFilter: ['equals', 'has', 'hasEvery', 'hasSome', 'isEmpty'],
  NestedStringNullableFilter: [
    'equals',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'contains',
    'startsWith',
    'endsWith',
    'not',
    'isSet',
  ],
  StringNullableWithAggregatesFilter: [
    'equals',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'contains',
    'startsWith',
    'endsWith',
    'mode',
    'not',
    '_count',
    '_min',
    '_max',
    'isSet',
  ],
  NestedIntFilter: ['equals', 'in', 'notIn', 'lt', 'lte', 'gt', 'gte', 'not'],
  StringWithAggregatesFilter: [
    'equals',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'contains',
    'startsWith',
    'endsWith',
    'mode',
    'not',
    '_count',
    '_min',
    '_max',
  ],
  NestedIntNullableFilter: ['equals', 'in', 'notIn', 'lt', 'lte', 'gt', 'gte', 'not', 'isSet'],
  UserCountOrderByAggregateInput: [
    'id',
    'email',
    'name',
    'password',
    'followerIDs',
    'followingIDs',
    'likePostIDs',
    'roles',
  ],
  NestedStringNullableWithAggregatesFilter: [
    'equals',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'contains',
    'startsWith',
    'endsWith',
    'not',
    '_count',
    '_min',
    '_max',
    'isSet',
  ],
  UserCreateInput: [
    'id',
    'email',
    'name',
    'password',
    'followers',
    'followerIDs',
    'following',
    'followingIDs',
    'likePosts',
    'likePostIDs',
    'posts',
    'roles',
  ],
  NestedStringWithAggregatesFilter: [
    'equals',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'contains',
    'startsWith',
    'endsWith',
    'not',
    '_count',
    '_min',
    '_max',
  ],
  UserCreateManyInput: [
    'id',
    'email',
    'name',
    'password',
    'followerIDs',
    'followingIDs',
    'likePostIDs',
    'roles',
  ],
  PostCreateOrConnectWithoutLikesInput: ['where', 'create'],
  UserOrderByWithAggregationInput: [
    'id',
    'email',
    'name',
    'password',
    'followerIDs',
    'followingIDs',
    'likePostIDs',
    'roles',
    '_count',
    '_max',
    '_min',
  ],
  PostCreateOrConnectWithoutAuthorInput: ['where', 'create'],
  UserOrderByWithRelationInput: [
    'id',
    'email',
    'name',
    'password',
    'followers',
    'followerIDs',
    'following',
    'followingIDs',
    'likePosts',
    'likePostIDs',
    'posts',
    'roles',
  ],
  PostCreateManyAuthorInputEnvelope: ['data'],
  UserWhereInput: ["AND", "OR", "NOT", "id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "roles"],
  PostCreateWithoutAuthorInput: ['id', 'title', 'likes', 'likeIDs'],
  UserWhereUniqueInput: ["id", "email"],
  PostCreateWithoutLikesInput: ['id', 'title', 'author', 'likeIDs'],
  UserScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  PostUpdatelikeIDsInput: ['set', 'push'],
  PostUpsertWithWhereUniqueWithoutLikesInput: ['where', 'update', 'create'],
  UserCreateNestedManyWithoutFollowersInput: ['create', 'connectOrCreate', 'connect'],
  PostUpdateManyWithWhereWithoutLikesInput: ['where', 'data'],
  UserCreateNestedManyWithoutFollowingInput: ['create', 'connectOrCreate', 'connect'],
  PostScalarWhereInput: ['AND', 'OR', 'NOT', 'id', 'title', 'authorId', 'likeIDs'],
  UserUpdateInput: ["email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "roles"],
  PostUpdateWithWhereUniqueWithoutAuthorInput: ['where', 'data'],
  UserUpdateManyMutationInput: ["email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  PostUpdateManyWithWhereWithoutAuthorInput: ['where', 'data'],
  PostUpdateWithWhereUniqueWithoutLikesInput: ['where', 'data'],
  UserCreateNestedManyWithoutLikePostsInput: ['create', 'connectOrCreate', 'connect'],
  PostUpsertWithWhereUniqueWithoutAuthorInput: ['where', 'update', 'create'],
  UserCreateNestedOneWithoutPostsInput: ['create', 'connectOrCreate', 'connect'],
  UserCreateOrConnectWithoutFollowersInput: ['where', 'create'],
  UserListRelationFilter: ["every", "some", "none"],
  PostCreateManyAuthorInput: ['id', 'title', 'likeIDs'],
  UserCreateOrConnectWithoutFollowingInput: ['where', 'create'],
  UserOrderByRelationAggregateInput: ["_count"],
  PostUpdateWithoutAuthorInput: ['title', 'likes', 'likeIDs'],
  UserMaxOrderByAggregateInput: ['id', 'email', 'name', 'password'],
  PostUpdateWithoutLikesInput: ['title', 'author', 'likeIDs'],
  UserMinOrderByAggregateInput: ["id", "email", "name", "password"],
  UserCreateOrConnectWithoutLikePostsInput: ['where', 'create'],
  UserCreateOrConnectWithoutPostsInput: ['where', 'create'],
  UserRelationFilter: ["is", "isNot"],
  UserCreateWithoutFollowersInput: [
    'id',
    'email',
    'name',
    'password',
    'followerIDs',
    'following',
    'followingIDs',
    'likePosts',
    'likePostIDs',
    'posts',
    'roles',
  ],
  UserCreateWithoutFollowingInput: [
    'id',
    'email',
    'name',
    'password',
    'followers',
    'followerIDs',
    'followingIDs',
    'likePosts',
    'likePostIDs',
    'posts',
    'roles',
  ],
  UserCreatefollowerIDsInput: ['set'],
  UserCreateWithoutLikePostsInput: [
    'id',
    'email',
    'name',
    'password',
    'followers',
    'followerIDs',
    'following',
    'followingIDs',
    'likePostIDs',
    'posts',
    'roles',
  ],
  UserCreatefollowingIDsInput: ['set'],
  UserCreateWithoutPostsInput: [
    'id',
    'email',
    'name',
    'password',
    'followers',
    'followerIDs',
    'following',
    'followingIDs',
    'likePosts',
    'likePostIDs',
    'roles',
  ],
  UserCreatelikePostIDsInput: ['set'],
  UserCreaterolesInput: ['set'],
  UserScalarWhereInput: [
    'AND',
    'OR',
    'NOT',
    'id',
    'email',
    'name',
    'password',
    'followerIDs',
    'followingIDs',
    'likePostIDs',
    'roles',
  ],
  UserUpdateManyWithWhereWithoutFollowersInput: ['where', 'data'],
  UserUpdateManyWithoutFollowersInput: [
    'create',
    'connectOrCreate',
    'upsert',
    'set',
    'disconnect',
    'delete',
    'connect',
    'update',
    'updateMany',
    'deleteMany',
  ],
  UserUpdateManyWithWhereWithoutFollowingInput: ['where', 'data'],
  UserUpdateManyWithoutFollowingInput: [
    'create',
    'connectOrCreate',
    'upsert',
    'set',
    'disconnect',
    'delete',
    'connect',
    'update',
    'updateMany',
    'deleteMany',
  ],
  UserUpdateManyWithWhereWithoutLikePostsInput: ['where', 'data'],
  UserUpdatefollowerIDsInput: ["set", "push"],
  UserUpdateManyWithoutLikePostsInput: [
    'create',
    'connectOrCreate',
    'upsert',
    'set',
    'disconnect',
    'delete',
    'connect',
    'update',
    'updateMany',
    'deleteMany',
  ],
  UserUpdatefollowingIDsInput: ["set", "push"],
  UserUpdateOneWithoutPostsInput: [
    'create',
    'connectOrCreate',
    'upsert',
    'disconnect',
    'delete',
    'connect',
    'update',
  ],
  UserUpdatelikePostIDsInput: ["set", "push"],
  UserUpdateWithWhereUniqueWithoutFollowersInput: ['where', 'data'],
  UserUpdaterolesInput: ["set", "push"],
  UserUpdateWithWhereUniqueWithoutFollowingInput: ['where', 'data'],
  UserUpdateWithWhereUniqueWithoutLikePostsInput: ['where', 'data'],
  UserUpdateWithoutFollowersInput: [
    'email',
    'name',
    'password',
    'followerIDs',
    'following',
    'followingIDs',
    'likePosts',
    'likePostIDs',
    'posts',
    'roles',
  ],
  UserUpdateWithoutFollowingInput: [
    'email',
    'name',
    'password',
    'followers',
    'followerIDs',
    'followingIDs',
    'likePosts',
    'likePostIDs',
    'posts',
    'roles',
  ],
  UserUpdateWithoutLikePostsInput: [
    'email',
    'name',
    'password',
    'followers',
    'followerIDs',
    'following',
    'followingIDs',
    'likePostIDs',
    'posts',
    'roles',
  ],
  UserUpdateWithoutPostsInput: [
    'email',
    'name',
    'password',
    'followers',
    'followerIDs',
    'following',
    'followingIDs',
    'likePosts',
    'likePostIDs',
    'roles',
  ],
  UserUpsertWithWhereUniqueWithoutFollowersInput: ['where', 'update', 'create'],
  UserUpsertWithWhereUniqueWithoutFollowingInput: ['where', 'update', 'create'],
  UserUpsertWithWhereUniqueWithoutLikePostsInput: ['where', 'update', 'create'],
  UserUpsertWithoutPostsInput: ['update', 'create'],
}

type InputTypesNames = keyof typeof inputTypes

type InputTypeFieldNames<TInput extends InputTypesNames> = Exclude<
  keyof typeof inputTypes[TInput]['prototype'],
  number | symbol
>

type InputTypeFieldsConfig<TInput extends InputTypesNames> = FieldsConfig<
  InputTypeFieldNames<TInput>
>

export type InputTypeConfig<TInput extends InputTypesNames> = {
  class?: ClassDecorator[]
  fields?: InputTypeFieldsConfig<TInput>
}

export type InputTypesEnhanceMap = {
  [TInput in InputTypesNames]?: InputTypeConfig<TInput>
}

export function applyInputTypesEnhanceMap(inputTypesEnhanceMap: InputTypesEnhanceMap) {
  for (const inputTypeEnhanceMapKey of Object.keys(inputTypesEnhanceMap)) {
    const inputTypeName = inputTypeEnhanceMapKey as keyof typeof inputTypesEnhanceMap
    const typeConfig = inputTypesEnhanceMap[inputTypeName]!
    const typeClass = inputTypes[inputTypeName]
    const typeTarget = typeClass.prototype
    applyTypeClassEnhanceConfig(
      typeConfig,
      typeClass,
      typeTarget,
      inputsInfo[inputTypeName as keyof typeof inputsInfo],
    )
  }
}
