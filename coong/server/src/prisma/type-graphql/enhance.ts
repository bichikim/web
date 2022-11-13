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
  Comment: crudResolvers.CommentCrudResolver,
  Post: crudResolvers.PostCrudResolver,
  Tag: crudResolvers.TagCrudResolver,
  User: crudResolvers.UserCrudResolver,
}
const actionResolversMap = {
  Comment: {
    aggregateComment: actionResolvers.AggregateCommentResolver,
    comment: actionResolvers.FindUniqueCommentResolver,
    comments: actionResolvers.FindManyCommentResolver,
    createManyComment: actionResolvers.CreateManyCommentResolver,
    createOneComment: actionResolvers.CreateOneCommentResolver,
    deleteManyComment: actionResolvers.DeleteManyCommentResolver,
    deleteOneComment: actionResolvers.DeleteOneCommentResolver,
    findFirstComment: actionResolvers.FindFirstCommentResolver,
    groupByComment: actionResolvers.GroupByCommentResolver,
    updateManyComment: actionResolvers.UpdateManyCommentResolver,
    updateOneComment: actionResolvers.UpdateOneCommentResolver,
    upsertOneComment: actionResolvers.UpsertOneCommentResolver,
  },
  Post: {
    aggregatePost: actionResolvers.AggregatePostResolver,
    createManyPost: actionResolvers.CreateManyPostResolver,
    createOnePost: actionResolvers.CreateOnePostResolver,
    deleteManyPost: actionResolvers.DeleteManyPostResolver,
    deleteOnePost: actionResolvers.DeleteOnePostResolver,
    findFirstPost: actionResolvers.FindFirstPostResolver,
    groupByPost: actionResolvers.GroupByPostResolver,
    post: actionResolvers.FindUniquePostResolver,
    posts: actionResolvers.FindManyPostResolver,
    updateManyPost: actionResolvers.UpdateManyPostResolver,
    updateOnePost: actionResolvers.UpdateOnePostResolver,
    upsertOnePost: actionResolvers.UpsertOnePostResolver,
  },
  Tag: {
    aggregateTag: actionResolvers.AggregateTagResolver,
    createManyTag: actionResolvers.CreateManyTagResolver,
    createOneTag: actionResolvers.CreateOneTagResolver,
    deleteManyTag: actionResolvers.DeleteManyTagResolver,
    deleteOneTag: actionResolvers.DeleteOneTagResolver,
    findFirstTag: actionResolvers.FindFirstTagResolver,
    groupByTag: actionResolvers.GroupByTagResolver,
    tag: actionResolvers.FindUniqueTagResolver,
    tags: actionResolvers.FindManyTagResolver,
    updateManyTag: actionResolvers.UpdateManyTagResolver,
    updateOneTag: actionResolvers.UpdateOneTagResolver,
    upsertOneTag: actionResolvers.UpsertOneTagResolver,
  },
  User: {
    aggregateUser: actionResolvers.AggregateUserResolver,
    createManyUser: actionResolvers.CreateManyUserResolver,
    createOneUser: actionResolvers.CreateOneUserResolver,
    deleteManyUser: actionResolvers.DeleteManyUserResolver,
    deleteOneUser: actionResolvers.DeleteOneUserResolver,
    findFirstUser: actionResolvers.FindFirstUserResolver,
    groupByUser: actionResolvers.GroupByUserResolver,
    updateManyUser: actionResolvers.UpdateManyUserResolver,
    updateOneUser: actionResolvers.UpdateOneUserResolver,
    upsertOneUser: actionResolvers.UpsertOneUserResolver,
    user: actionResolvers.FindUniqueUserResolver,
    users: actionResolvers.FindManyUserResolver,
  },
}
const crudResolversInfo = {
  Comment: [
    'aggregateComment',
    'createManyComment',
    'createOneComment',
    'deleteManyComment',
    'deleteOneComment',
    'findFirstComment',
    'comments',
    'comment',
    'groupByComment',
    'updateManyComment',
    'updateOneComment',
    'upsertOneComment',
  ],
  Post: [
    'aggregatePost',
    'createManyPost',
    'createOnePost',
    'deleteManyPost',
    'deleteOnePost',
    'findFirstPost',
    'posts',
    'post',
    'groupByPost',
    'updateManyPost',
    'updateOnePost',
    'upsertOnePost',
  ],
  Tag: [
    'aggregateTag',
    'createManyTag',
    'createOneTag',
    'deleteManyTag',
    'deleteOneTag',
    'findFirstTag',
    'tags',
    'tag',
    'groupByTag',
    'updateManyTag',
    'updateOneTag',
    'upsertOneTag',
  ],
  User: [
    'aggregateUser',
    'createManyUser',
    'createOneUser',
    'deleteManyUser',
    'deleteOneUser',
    'findFirstUser',
    'users',
    'user',
    'groupByUser',
    'updateManyUser',
    'updateOneUser',
    'upsertOneUser',
  ],
}
const argsInfo = {
  AggregateUserArgs: ['where', 'orderBy', 'cursor', 'take', 'skip'],
  CreateManyUserArgs: ['data'],
  AggregatePostArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateOneUserArgs: ['data'],
  CreateManyPostArgs: ['data'],
  DeleteManyUserArgs: ['where'],
  CreateOnePostArgs: ['data'],
  DeleteOneUserArgs: ['where'],
  DeleteManyPostArgs: ['where'],
  FindFirstUserArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  DeleteOnePostArgs: ['where'],
  FindManyUserArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindFirstPostArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindUniqueUserArgs: ['where'],
  AggregateCommentArgs: ["where", "orderBy", "cursor", "take", "skip"],
  GroupByUserArgs: ['where', 'orderBy', 'by', 'having', 'take', 'skip'],
  CreateManyCommentArgs: ['data'],
  UpdateManyUserArgs: ['data', 'where'],
  CreateOneCommentArgs: ['data'],
  UpdateOneUserArgs: ['data', 'where'],
  DeleteManyCommentArgs: ['where'],
  UpsertOneUserArgs: ["where", "create", "update"],
  DeleteOneCommentArgs: ['where'],
  FindManyPostArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindFirstCommentArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindUniquePostArgs: ['where'],
  AggregateTagArgs: ["where", "orderBy", "cursor", "take", "skip"],
  GroupByPostArgs: ['where', 'orderBy', 'by', 'having', 'take', 'skip'],
  CreateManyTagArgs: ['data'],
  UpdateManyPostArgs: ['data', 'where'],
  CreateOneTagArgs: ['data'],
  UpdateOnePostArgs: ['data', 'where'],
  DeleteManyTagArgs: ['where'],
  UpsertOnePostArgs: ["where", "create", "update"],
  DeleteOneTagArgs: ['where'],
  FindManyCommentArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindFirstTagArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  FindUniqueCommentArgs: ['where'],
  FindManyTagArgs: ['where', 'orderBy', 'cursor', 'take', 'skip', 'distinct'],
  GroupByCommentArgs: ['where', 'orderBy', 'by', 'having', 'take', 'skip'],
  FindUniqueTagArgs: ['where'],
  UpdateManyCommentArgs: ['data', 'where'],
  GroupByTagArgs: ['where', 'orderBy', 'by', 'having', 'take', 'skip'],
  UpdateOneCommentArgs: ['data', 'where'],
  UpdateManyTagArgs: ['data', 'where'],
  UpsertOneCommentArgs: ["where", "create", "update"],
  UpdateOneTagArgs: ['data', 'where'],
  UpsertOneTagArgs: ['where', 'create', 'update'],
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
  Comment: relationResolvers.CommentRelationsResolver,
  Post: relationResolvers.PostRelationsResolver,
  Tag: relationResolvers.TagRelationsResolver,
  User: relationResolvers.UserRelationsResolver,
}
const relationResolversInfo = {
  Comment: ['port', 'author'],
  Post: ['author', 'likes', 'tags', 'comments'],
  Tag: ['posts'],
  User: ['followers', 'following', 'likePosts', 'posts', 'comments'],
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
  Comment: ['id', 'message', 'postId', 'authorId'],
  Post: ['id', 'title', 'message', 'authorId', 'likeIDs', 'tagIDs'],
  Tag: ['id', 'name', 'postIDs'],
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
  AggregateComment: ['_count', '_min', '_max'],
  AggregatePost: ['_count', '_min', '_max'],
  AggregateTag: ['_count', '_min', '_max'],
  AggregateUser: ['_count', '_min', '_max'],
  CommentGroupBy: ['id', 'message', 'postId', 'authorId', '_count', '_min', '_max'],
  PostCount: ['likes', 'tags', 'comments'],
  PostCountAggregate: ['id', 'title', 'message', 'authorId', 'likeIDs', 'tagIDs', '_all'],
  CommentCountAggregate: ['id', 'message', 'postId', 'authorId', '_all'],
  PostGroupBy: [
    'id',
    'title',
    'message',
    'authorId',
    'likeIDs',
    'tagIDs',
    '_count',
    '_min',
    '_max',
  ],
  CommentMaxAggregate: ['id', 'message', 'postId', 'authorId'],
  UserGroupBy: ["id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles", "_count", "_min", "_max"],
  CommentMinAggregate: ['id', 'message', 'postId', 'authorId'],
  TagGroupBy: ['id', 'name', 'postIDs', '_count', '_min', '_max'],
  PostMaxAggregate: ['id', 'title', 'message', 'authorId'],
  UserCount: ['followers', 'following', 'likePosts', 'posts', 'comments'],
  PostMinAggregate: ['id', 'title', 'message', 'authorId'],
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
  TagCount: ['posts'],
  UserMaxAggregate: ['id', 'email', 'name', 'password'],
  TagCountAggregate: ['id', 'name', 'postIDs', '_all'],
  UserMinAggregate: ["id", "email", "name", "password"],
  TagMaxAggregate: ['id', 'name'],
  TagMinAggregate: ['id', 'name'],
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
  PostOrderByWithAggregationInput: [
    'id',
    'title',
    'message',
    'authorId',
    'likeIDs',
    'tagIDs',
    '_count',
    '_max',
    '_min',
  ],
  CommentWhereInput: ['AND', 'OR', 'NOT', 'id', 'message', 'port', 'postId', 'author', 'authorId'],
  PostOrderByWithRelationInput: [
    'id',
    'title',
    'message',
    'author',
    'authorId',
    'likes',
    'likeIDs',
    'tags',
    'tagIDs',
    'comments',
  ],
  CommentOrderByWithRelationInput: ['id', 'message', 'port', 'postId', 'author', 'authorId'],
  PostWhereInput: [
    'AND',
    'OR',
    'NOT',
    'id',
    'title',
    'message',
    'author',
    'authorId',
    'likes',
    'likeIDs',
    'tags',
    'tagIDs',
    'comments',
  ],
  CommentOrderByWithAggregationInput: [
    'id',
    'message',
    'postId',
    'authorId',
    '_count',
    '_max',
    '_min',
  ],
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
  CommentScalarWhereWithAggregatesInput: [
    'AND',
    'OR',
    'NOT',
    'id',
    'message',
    'postId',
    'authorId',
  ],
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
    'comments',
    'roles',
  ],
  CommentWhereUniqueInput: ['id'],
  UserWhereInput: ["AND", "OR", "NOT", "id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  PostScalarWhereWithAggregatesInput: [
    'AND',
    'OR',
    'NOT',
    'id',
    'title',
    'message',
    'authorId',
    'likeIDs',
    'tagIDs',
  ],
  UserWhereUniqueInput: ["id", "email"],
  PostWhereUniqueInput: ['id'],
  UserScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  PostCreateInput: [
    'id',
    'title',
    'message',
    'author',
    'likes',
    'likeIDs',
    'tags',
    'tagIDs',
    'comments',
  ],
  PostCreateManyInput: ["id", "title", "message", "authorId", "likeIDs", "tagIDs"],
  TagOrderByWithAggregationInput: ['id', 'name', 'postIDs', '_count', '_max', '_min'],
  CommentCreateInput: ["id", "message", "port", "author"],
  TagOrderByWithRelationInput: ['id', 'name', 'posts', 'postIDs'],
  CommentCreateManyInput: ["id", "message", "postId", "authorId"],
  TagScalarWhereWithAggregatesInput: ['AND', 'OR', 'NOT', 'id', 'name', 'postIDs'],
  CommentUpdateInput: ['message', 'port', 'author'],
  TagWhereInput: ['AND', 'OR', 'NOT', 'id', 'name', 'posts', 'postIDs'],
  CommentUpdateManyMutationInput: ['message'],
  TagWhereUniqueInput: ['id'],
  PostUpdateInput: ['title', 'message', 'author', 'likes', 'likeIDs', 'tags', 'tagIDs', 'comments'],
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
    'comments',
    'roles',
  ],
  PostUpdateManyMutationInput: ['title', 'message', 'likeIDs', 'tagIDs'],
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
  UserUpdateInput: ["email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  CommentListRelationFilter: ['every', 'some', 'none'],
  UserUpdateManyMutationInput: ["email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  PostListRelationFilter: ['every', 'some', 'none'],
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
  CommentOrderByRelationAggregateInput: ['_count'],
  StringNullableListFilter: ['equals', 'has', 'hasEvery', 'hasSome', 'isEmpty'],
  PostOrderByRelationAggregateInput: ['_count'],
  TagCreateInput: ['id', 'name', 'posts', 'postIDs'],
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
  TagCreateManyInput: ['id', 'name', 'postIDs'],
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
  TagUpdateInput: ["name", "posts", "postIDs"],
  TagListRelationFilter: ['every', 'some', 'none'],
  TagUpdateManyMutationInput: ["name", "postIDs"],
  PostCountOrderByAggregateInput: ['id', 'title', 'message', 'authorId', 'likeIDs', 'tagIDs'],
  PostMaxOrderByAggregateInput: ['id', 'title', 'message', 'authorId'],
  UserListRelationFilter: ["every", "some", "none"],
  CommentCountOrderByAggregateInput: ['id', 'message', 'postId', 'authorId'],
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
  CommentMaxOrderByAggregateInput: ['id', 'message', 'postId', 'authorId'],
  UserOrderByRelationAggregateInput: ["_count"],
  CommentMinOrderByAggregateInput: ['id', 'message', 'postId', 'authorId'],
  PostMinOrderByAggregateInput: ['id', 'title', 'message', 'authorId'],
  UserMaxOrderByAggregateInput: ['id', 'email', 'name', 'password'],
  PostRelationFilter: ['is', 'isNot'],
  UserMinOrderByAggregateInput: ["id", "email", "name", "password"],
  PostCreateNestedManyWithoutLikesInput: ['create', 'connectOrCreate', 'connect'],
  PostCreateNestedManyWithoutAuthorInput: ["create", "connectOrCreate", "createMany", "connect"],
  UserRelationFilter: ["is", "isNot"],
  CommentCreateNestedManyWithoutAuthorInput: ['create', 'connectOrCreate', 'createMany', 'connect'],
  TagOrderByRelationAggregateInput: ["_count"],
  StringFieldUpdateOperationsInput: ['set'],
  TagCountOrderByAggregateInput: ['id', 'name', 'postIDs'],
  NullableStringFieldUpdateOperationsInput: ['set', 'unset'],
  TagMaxOrderByAggregateInput: ['id', 'name'],
  TagMinOrderByAggregateInput: ['id', 'name'],
  PostUpdateManyWithoutLikesNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  UserCreateNestedManyWithoutFollowersInput: ['create', 'connectOrCreate', 'connect'],
  PostUpdateManyWithoutAuthorNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  UserCreateNestedManyWithoutFollowingInput: ['create', 'connectOrCreate', 'connect'],
  CommentUpdateManyWithoutAuthorNestedInput: [
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
  UserCreatefollowerIDsInput: ['set'],
  UserCreateNestedOneWithoutPostsInput: ['create', 'connectOrCreate', 'connect'],
  UserCreatefollowingIDsInput: ['set'],
  PostCreatelikeIDsInput: ['set'],
  UserCreatelikePostIDsInput: ['set'],
  PostCreatetagIDsInput: ['set'],
  UserCreaterolesInput: ['set'],
  CommentCreateNestedManyWithoutPortInput: ['create', 'connectOrCreate', 'createMany', 'connect'],
  UserUpdateManyWithoutFollowersNestedInput: [
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
  TagCreateNestedManyWithoutPostsInput: ['create', 'connectOrCreate', 'connect'],
  UserUpdateManyWithoutFollowingNestedInput: [
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
  PostUpdatelikeIDsInput: ['set', 'push'],
  UserUpdatefollowerIDsInput: ["set", "push"],
  PostUpdatetagIDsInput: ['set', 'push'],
  UserUpdatefollowingIDsInput: ["set", "push"],
  CommentUpdateManyWithoutPortNestedInput: [
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
  UserUpdatelikePostIDsInput: ["set", "push"],
  PostCreateNestedOneWithoutCommentsInput: ['create', 'connectOrCreate', 'connect'],
  PostCreateNestedManyWithoutTagsInput: ['create', 'connectOrCreate', 'connect'],
  UserUpdaterolesInput: ["set", "push"],
  PostUpdateManyWithoutTagsNestedInput: [
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
  UserCreateNestedManyWithoutLikePostsInput: ["create", "connectOrCreate", "connect"],
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
  UserUpdateManyWithoutLikePostsNestedInput: [
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
  NestedIntFilter: ['equals', 'in', 'notIn', 'lt', 'lte', 'gt', 'gte', 'not'],
  UserUpdateOneRequiredWithoutPostsNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  NestedIntNullableFilter: ['equals', 'in', 'notIn', 'lt', 'lte', 'gt', 'gte', 'not', 'isSet'],
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
  TagUpdateManyWithoutPostsNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
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
  PostUpdateOneRequiredWithoutCommentsNestedInput: [
    'create',
    'connectOrCreate',
    'upsert',
    'connect',
    'update',
  ],
  PostCreateOrConnectWithoutLikesInput: ['where', 'create'],
  UserCreateNestedOneWithoutCommentsInput: ["create", "connectOrCreate", "connect"],
  PostCreateOrConnectWithoutAuthorInput: ['where', 'create'],
  UserUpdateOneRequiredWithoutCommentsNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  CommentCreateWithoutAuthorInput: ['id', 'message', 'port'],
  TagCreatepostIDsInput: ["set"],
  CommentCreateManyAuthorInputEnvelope: ['data'],
  TagUpdatepostIDsInput: ["set", "push"],
  CommentCreateOrConnectWithoutAuthorInput: ['where', 'create'],
  PostCreateManyAuthorInputEnvelope: ['data'],
  UserCreateOrConnectWithoutFollowersInput: ['where', 'create'],
  PostCreateWithoutAuthorInput: [
    'id',
    'title',
    'message',
    'likes',
    'likeIDs',
    'tags',
    'tagIDs',
    'comments',
  ],
  UserCreateOrConnectWithoutFollowingInput: ['where', 'create'],
  PostCreateWithoutLikesInput: [
    'id',
    'title',
    'message',
    'author',
    'likeIDs',
    'tags',
    'tagIDs',
    'comments',
  ],
  UserCreateWithoutFollowingInput: ["id", "email", "name", "password", "followers", "followerIDs", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  PostUpdateManyWithWhereWithoutLikesInput: ["where", "data"],
  UserCreateWithoutFollowersInput: ["id", "email", "name", "password", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  PostScalarWhereInput: [
    'AND',
    'OR',
    'NOT',
    'id',
    'title',
    'message',
    'authorId',
    'likeIDs',
    'tagIDs',
  ],
  PostUpsertWithWhereUniqueWithoutLikesInput: ['where', 'update', 'create'],
  PostUpdateWithWhereUniqueWithoutAuthorInput: ['where', 'data'],
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
  CommentUpsertWithWhereUniqueWithoutAuthorInput: ['where', 'update', 'create'],
  UserUpdateManyWithWhereWithoutFollowingInput: ['where', 'data'],
  CommentUpdateManyWithWhereWithoutAuthorInput: ['where', 'data'],
  UserUpdateWithWhereUniqueWithoutFollowingInput: ['where', 'data'],
  CommentScalarWhereInput: ['AND', 'OR', 'NOT', 'id', 'message', 'postId', 'authorId'],
  UserUpsertWithWhereUniqueWithoutFollowingInput: ["where", "update", "create"],
  CommentUpdateWithWhereUniqueWithoutAuthorInput: ['where', 'data'],
  UserUpdateWithWhereUniqueWithoutFollowersInput: ['where', 'data'],
  PostUpdateManyWithWhereWithoutAuthorInput: ['where', 'data'],
  UserUpsertWithWhereUniqueWithoutFollowersInput: ["where", "update", "create"],
  CommentCreateOrConnectWithoutPortInput: ["where", "create"],
  UserUpdateManyWithWhereWithoutFollowersInput: ["where", "data"],
  CommentCreateManyPortInputEnvelope: ['data'],
  PostUpdateWithWhereUniqueWithoutLikesInput: ["where", "data"],
  CommentCreateWithoutPortInput: ['id', 'message', 'author'],
  PostUpsertWithWhereUniqueWithoutAuthorInput: ['where', 'update', 'create'],
  TagCreateOrConnectWithoutPostsInput: ['where', 'create'],
  TagCreateWithoutPostsInput: ['id', 'name', 'postIDs'],
  TagUpsertWithWhereUniqueWithoutPostsInput: ['where', 'update', 'create'],
  UserCreateOrConnectWithoutLikePostsInput: ['where', 'create'],
  TagUpdateManyWithWhereWithoutPostsInput: ['where', 'data'],
  UserCreateOrConnectWithoutPostsInput: ['where', 'create'],
  CommentUpsertWithWhereUniqueWithoutPortInput: ['where', 'update', 'create'],
  UserCreateWithoutPostsInput: ["id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "comments", "roles"],
  CommentUpdateManyWithWhereWithoutPortInput: ['where', 'data'],
  UserCreateWithoutLikePostsInput: ["id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePostIDs", "posts", "comments", "roles"],
  CommentUpdateWithWhereUniqueWithoutPortInput: ['where', 'data'],
  PostCreateOrConnectWithoutCommentsInput: ['where', 'create'],
  UserUpdateWithWhereUniqueWithoutLikePostsInput: ['where', 'data'],
  PostCreateWithoutCommentsInput: [
    'id',
    'title',
    'message',
    'author',
    'likes',
    'likeIDs',
    'tags',
    'tagIDs',
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
    'comments',
    'roles',
  ],
  PostUpdateWithoutCommentsInput: [
    'title',
    'message',
    'author',
    'likes',
    'likeIDs',
    'tags',
    'tagIDs',
  ],
  UserUpsertWithoutPostsInput: ["update", "create"],
  PostCreateOrConnectWithoutTagsInput: ["where", "create"],
  UserUpsertWithWhereUniqueWithoutLikePostsInput: ["where", "update", "create"],
  PostCreateWithoutTagsInput: [
    'id',
    'title',
    'message',
    'author',
    'likes',
    'likeIDs',
    'tagIDs',
    'comments',
  ],
  UserUpdateManyWithWhereWithoutLikePostsInput: ["where", "data"],
  PostCreateManyAuthorInput: ["id", "title", "message", "likeIDs", "tagIDs"],
  TagUpdateWithWhereUniqueWithoutPostsInput: ["where", "data"],
  CommentCreateManyAuthorInput: ['id', 'message', 'postId'],
  TagScalarWhereInput: ["AND", "OR", "NOT", "id", "name", "postIDs"],
  PostUpdateManyWithWhereWithoutTagsInput: ['where', 'data'],
  PostUpsertWithoutCommentsInput: ['update', 'create'],
  PostUpdateWithWhereUniqueWithoutTagsInput: ['where', 'data'],
  UserCreateOrConnectWithoutCommentsInput: ['where', 'create'],
  CommentCreateManyPortInput: ['id', 'message', 'authorId'],
  UserCreateWithoutCommentsInput: ["id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "roles"],
  CommentUpdateWithoutAuthorInput: ['message', 'port'],
  UserUpdateWithoutCommentsInput: [
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
  CommentUpdateWithoutPortInput: ['message', 'author'],
  UserUpsertWithoutCommentsInput: ["update", "create"],
  PostUpdateWithoutAuthorInput: [
    'title',
    'message',
    'likes',
    'likeIDs',
    'tags',
    'tagIDs',
    'comments',
  ],
  PostUpdateWithoutLikesInput: [
    'title',
    'message',
    'author',
    'likeIDs',
    'tags',
    'tagIDs',
    'comments',
  ],
  PostUpdateWithoutTagsInput: [
    'title',
    'message',
    'author',
    'likes',
    'likeIDs',
    'tagIDs',
    'comments',
  ],
  PostUpsertWithWhereUniqueWithoutTagsInput: ["where", "update", "create"],
  TagUpdateWithoutPostsInput: ['name', 'postIDs'],
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
    'comments',
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
    'comments',
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
    'comments',
    'roles',
  ],
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
