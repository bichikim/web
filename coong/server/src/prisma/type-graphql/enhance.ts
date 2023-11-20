import { ClassType } from "type-graphql";
import * as tslib from "tslib";
import * as crudResolvers from "./resolvers/crud/resolvers-crud.index";
import * as argsTypes from "./resolvers/crud/args.index";
import * as actionResolvers from "./resolvers/crud/resolvers-actions.index";
import * as relationResolvers from "./resolvers/relations/resolvers.index";
import * as models from "./models";
import * as outputTypes from "./resolvers/outputs";
import * as inputTypes from "./resolvers/inputs";

export type MethodDecoratorOverrideFn = (decorators: MethodDecorator[]) => MethodDecorator[];

const crudResolversMap = {
  User: crudResolvers.UserCrudResolver,
  Post: crudResolvers.PostCrudResolver,
  Comment: crudResolvers.CommentCrudResolver,
  Tag: crudResolvers.TagCrudResolver
};
const actionResolversMap = {
  User: {
    aggregateUser: actionResolvers.AggregateUserResolver,
    createManyUser: actionResolvers.CreateManyUserResolver,
    createOneUser: actionResolvers.CreateOneUserResolver,
    deleteManyUser: actionResolvers.DeleteManyUserResolver,
    deleteOneUser: actionResolvers.DeleteOneUserResolver,
    findFirstUser: actionResolvers.FindFirstUserResolver,
    findFirstUserOrThrow: actionResolvers.FindFirstUserOrThrowResolver,
    users: actionResolvers.FindManyUserResolver,
    user: actionResolvers.FindUniqueUserResolver,
    getUser: actionResolvers.FindUniqueUserOrThrowResolver,
    groupByUser: actionResolvers.GroupByUserResolver,
    updateManyUser: actionResolvers.UpdateManyUserResolver,
    updateOneUser: actionResolvers.UpdateOneUserResolver,
    upsertOneUser: actionResolvers.UpsertOneUserResolver
  },
  Post: {
    aggregatePost: actionResolvers.AggregatePostResolver,
    createManyPost: actionResolvers.CreateManyPostResolver,
    createOnePost: actionResolvers.CreateOnePostResolver,
    deleteManyPost: actionResolvers.DeleteManyPostResolver,
    deleteOnePost: actionResolvers.DeleteOnePostResolver,
    findFirstPost: actionResolvers.FindFirstPostResolver,
    findFirstPostOrThrow: actionResolvers.FindFirstPostOrThrowResolver,
    posts: actionResolvers.FindManyPostResolver,
    post: actionResolvers.FindUniquePostResolver,
    getPost: actionResolvers.FindUniquePostOrThrowResolver,
    groupByPost: actionResolvers.GroupByPostResolver,
    updateManyPost: actionResolvers.UpdateManyPostResolver,
    updateOnePost: actionResolvers.UpdateOnePostResolver,
    upsertOnePost: actionResolvers.UpsertOnePostResolver
  },
  Comment: {
    aggregateComment: actionResolvers.AggregateCommentResolver,
    createManyComment: actionResolvers.CreateManyCommentResolver,
    createOneComment: actionResolvers.CreateOneCommentResolver,
    deleteManyComment: actionResolvers.DeleteManyCommentResolver,
    deleteOneComment: actionResolvers.DeleteOneCommentResolver,
    findFirstComment: actionResolvers.FindFirstCommentResolver,
    findFirstCommentOrThrow: actionResolvers.FindFirstCommentOrThrowResolver,
    comments: actionResolvers.FindManyCommentResolver,
    comment: actionResolvers.FindUniqueCommentResolver,
    getComment: actionResolvers.FindUniqueCommentOrThrowResolver,
    groupByComment: actionResolvers.GroupByCommentResolver,
    updateManyComment: actionResolvers.UpdateManyCommentResolver,
    updateOneComment: actionResolvers.UpdateOneCommentResolver,
    upsertOneComment: actionResolvers.UpsertOneCommentResolver
  },
  Tag: {
    aggregateTag: actionResolvers.AggregateTagResolver,
    createManyTag: actionResolvers.CreateManyTagResolver,
    createOneTag: actionResolvers.CreateOneTagResolver,
    deleteManyTag: actionResolvers.DeleteManyTagResolver,
    deleteOneTag: actionResolvers.DeleteOneTagResolver,
    findFirstTag: actionResolvers.FindFirstTagResolver,
    findFirstTagOrThrow: actionResolvers.FindFirstTagOrThrowResolver,
    tags: actionResolvers.FindManyTagResolver,
    tag: actionResolvers.FindUniqueTagResolver,
    getTag: actionResolvers.FindUniqueTagOrThrowResolver,
    groupByTag: actionResolvers.GroupByTagResolver,
    updateManyTag: actionResolvers.UpdateManyTagResolver,
    updateOneTag: actionResolvers.UpdateOneTagResolver,
    upsertOneTag: actionResolvers.UpsertOneTagResolver
  }
};
const crudResolversInfo = {
  User: ["aggregateUser", "createManyUser", "createOneUser", "deleteManyUser", "deleteOneUser", "findFirstUser", "findFirstUserOrThrow", "users", "user", "getUser", "groupByUser", "updateManyUser", "updateOneUser", "upsertOneUser"],
  Post: ["aggregatePost", "createManyPost", "createOnePost", "deleteManyPost", "deleteOnePost", "findFirstPost", "findFirstPostOrThrow", "posts", "post", "getPost", "groupByPost", "updateManyPost", "updateOnePost", "upsertOnePost"],
  Comment: ["aggregateComment", "createManyComment", "createOneComment", "deleteManyComment", "deleteOneComment", "findFirstComment", "findFirstCommentOrThrow", "comments", "comment", "getComment", "groupByComment", "updateManyComment", "updateOneComment", "upsertOneComment"],
  Tag: ["aggregateTag", "createManyTag", "createOneTag", "deleteManyTag", "deleteOneTag", "findFirstTag", "findFirstTagOrThrow", "tags", "tag", "getTag", "groupByTag", "updateManyTag", "updateOneTag", "upsertOneTag"]
};
const argsInfo = {
  AggregateUserArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyUserArgs: ["data"],
  CreateOneUserArgs: ["data"],
  DeleteManyUserArgs: ["where"],
  DeleteOneUserArgs: ["where"],
  FindFirstUserArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstUserOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyUserArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueUserArgs: ["where"],
  FindUniqueUserOrThrowArgs: ["where"],
  GroupByUserArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyUserArgs: ["data", "where"],
  UpdateOneUserArgs: ["data", "where"],
  UpsertOneUserArgs: ["where", "create", "update"],
  AggregatePostArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyPostArgs: ["data"],
  CreateOnePostArgs: ["data"],
  DeleteManyPostArgs: ["where"],
  DeleteOnePostArgs: ["where"],
  FindFirstPostArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstPostOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyPostArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniquePostArgs: ["where"],
  FindUniquePostOrThrowArgs: ["where"],
  GroupByPostArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyPostArgs: ["data", "where"],
  UpdateOnePostArgs: ["data", "where"],
  UpsertOnePostArgs: ["where", "create", "update"],
  AggregateCommentArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyCommentArgs: ["data"],
  CreateOneCommentArgs: ["data"],
  DeleteManyCommentArgs: ["where"],
  DeleteOneCommentArgs: ["where"],
  FindFirstCommentArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstCommentOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyCommentArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueCommentArgs: ["where"],
  FindUniqueCommentOrThrowArgs: ["where"],
  GroupByCommentArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyCommentArgs: ["data", "where"],
  UpdateOneCommentArgs: ["data", "where"],
  UpsertOneCommentArgs: ["where", "create", "update"],
  AggregateTagArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyTagArgs: ["data"],
  CreateOneTagArgs: ["data"],
  DeleteManyTagArgs: ["where"],
  DeleteOneTagArgs: ["where"],
  FindFirstTagArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstTagOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyTagArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueTagArgs: ["where"],
  FindUniqueTagOrThrowArgs: ["where"],
  GroupByTagArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyTagArgs: ["data", "where"],
  UpdateOneTagArgs: ["data", "where"],
  UpsertOneTagArgs: ["where", "create", "update"]
};

type ResolverModelNames = keyof typeof crudResolversMap;

type ModelResolverActionNames<
  TModel extends ResolverModelNames
> = keyof typeof crudResolversMap[TModel]["prototype"];

export type ResolverActionsConfig<
  TModel extends ResolverModelNames
> = Partial<Record<ModelResolverActionNames<TModel>, MethodDecorator[] | MethodDecoratorOverrideFn>>
  & {
    _all?: MethodDecorator[];
    _query?: MethodDecorator[];
    _mutation?: MethodDecorator[];
  };

export type ResolversEnhanceMap = {
  [TModel in ResolverModelNames]?: ResolverActionsConfig<TModel>;
};

export function applyResolversEnhanceMap(
  resolversEnhanceMap: ResolversEnhanceMap,
) {
  const mutationOperationPrefixes = [
    "createOne", "createMany", "deleteOne", "updateOne", "deleteMany", "updateMany", "upsertOne"
  ];
  for (const resolversEnhanceMapKey of Object.keys(resolversEnhanceMap)) {
    const modelName = resolversEnhanceMapKey as keyof typeof resolversEnhanceMap;
    const crudTarget = crudResolversMap[modelName].prototype;
    const resolverActionsConfig = resolversEnhanceMap[modelName]!;
    const actionResolversConfig = actionResolversMap[modelName];
    const allActionsDecorators = resolverActionsConfig._all;
    const resolverActionNames = crudResolversInfo[modelName as keyof typeof crudResolversInfo];
    for (const resolverActionName of resolverActionNames) {
      const maybeDecoratorsOrFn = resolverActionsConfig[
        resolverActionName as keyof typeof resolverActionsConfig
      ] as MethodDecorator[] | MethodDecoratorOverrideFn | undefined;
      const isWriteOperation = mutationOperationPrefixes.some(prefix => resolverActionName.startsWith(prefix));
      const operationKindDecorators = isWriteOperation ? resolverActionsConfig._mutation : resolverActionsConfig._query;
      const mainDecorators = [
        ...allActionsDecorators ?? [],
        ...operationKindDecorators ?? [],
      ]
      let decorators: MethodDecorator[];
      if (typeof maybeDecoratorsOrFn === "function") {
        decorators = maybeDecoratorsOrFn(mainDecorators);
      } else {
        decorators = [...mainDecorators, ...maybeDecoratorsOrFn ?? []];
      }
      const actionTarget = (actionResolversConfig[
        resolverActionName as keyof typeof actionResolversConfig
      ] as Function).prototype;
      tslib.__decorate(decorators, crudTarget, resolverActionName, null);
      tslib.__decorate(decorators, actionTarget, resolverActionName, null);
    }
  }
}

type ArgsTypesNames = keyof typeof argsTypes;

type ArgFieldNames<TArgsType extends ArgsTypesNames> = Exclude<
  keyof typeof argsTypes[TArgsType]["prototype"],
  number | symbol
>;

type ArgFieldsConfig<
  TArgsType extends ArgsTypesNames
> = FieldsConfig<ArgFieldNames<TArgsType>>;

export type ArgConfig<TArgsType extends ArgsTypesNames> = {
  class?: ClassDecorator[];
  fields?: ArgFieldsConfig<TArgsType>;
};

export type ArgsTypesEnhanceMap = {
  [TArgsType in ArgsTypesNames]?: ArgConfig<TArgsType>;
};

export function applyArgsTypesEnhanceMap(
  argsTypesEnhanceMap: ArgsTypesEnhanceMap,
) {
  for (const argsTypesEnhanceMapKey of Object.keys(argsTypesEnhanceMap)) {
    const argsTypeName = argsTypesEnhanceMapKey as keyof typeof argsTypesEnhanceMap;
    const typeConfig = argsTypesEnhanceMap[argsTypeName]!;
    const typeClass = argsTypes[argsTypeName];
    const typeTarget = typeClass.prototype;
    applyTypeClassEnhanceConfig(
      typeConfig,
      typeClass,
      typeTarget,
      argsInfo[argsTypeName as keyof typeof argsInfo],
    );
  }
}

const relationResolversMap = {
  User: relationResolvers.UserRelationsResolver,
  Post: relationResolvers.PostRelationsResolver,
  Comment: relationResolvers.CommentRelationsResolver,
  Tag: relationResolvers.TagRelationsResolver
};
const relationResolversInfo = {
  User: ["followers", "following", "likePosts", "posts", "comments"],
  Post: ["author", "likes", "tags", "comments"],
  Comment: ["port", "author"],
  Tag: ["posts"]
};

type RelationResolverModelNames = keyof typeof relationResolversMap;

type RelationResolverActionNames<
  TModel extends RelationResolverModelNames
> = keyof typeof relationResolversMap[TModel]["prototype"];

export type RelationResolverActionsConfig<TModel extends RelationResolverModelNames>
  = Partial<Record<RelationResolverActionNames<TModel>, MethodDecorator[] | MethodDecoratorOverrideFn>>
  & { _all?: MethodDecorator[] };

export type RelationResolversEnhanceMap = {
  [TModel in RelationResolverModelNames]?: RelationResolverActionsConfig<TModel>;
};

export function applyRelationResolversEnhanceMap(
  relationResolversEnhanceMap: RelationResolversEnhanceMap,
) {
  for (const relationResolversEnhanceMapKey of Object.keys(relationResolversEnhanceMap)) {
    const modelName = relationResolversEnhanceMapKey as keyof typeof relationResolversEnhanceMap;
    const relationResolverTarget = relationResolversMap[modelName].prototype;
    const relationResolverActionsConfig = relationResolversEnhanceMap[modelName]!;
    const allActionsDecorators = relationResolverActionsConfig._all ?? [];
    const relationResolverActionNames = relationResolversInfo[modelName as keyof typeof relationResolversInfo];
    for (const relationResolverActionName of relationResolverActionNames) {
      const maybeDecoratorsOrFn = relationResolverActionsConfig[
        relationResolverActionName as keyof typeof relationResolverActionsConfig
      ] as MethodDecorator[] | MethodDecoratorOverrideFn | undefined;
      let decorators: MethodDecorator[];
      if (typeof maybeDecoratorsOrFn === "function") {
        decorators = maybeDecoratorsOrFn(allActionsDecorators);
      } else {
        decorators = [...allActionsDecorators, ...maybeDecoratorsOrFn ?? []];
      }
      tslib.__decorate(decorators, relationResolverTarget, relationResolverActionName, null);
    }
  }
}

type TypeConfig = {
  class?: ClassDecorator[];
  fields?: FieldsConfig;
};

export type PropertyDecoratorOverrideFn = (decorators: PropertyDecorator[]) => PropertyDecorator[];

type FieldsConfig<TTypeKeys extends string = string> = Partial<
  Record<TTypeKeys, PropertyDecorator[] | PropertyDecoratorOverrideFn>
> & { _all?: PropertyDecorator[] };

function applyTypeClassEnhanceConfig<
  TEnhanceConfig extends TypeConfig,
  TType extends object
>(
  enhanceConfig: TEnhanceConfig,
  typeClass: ClassType<TType>,
  typePrototype: TType,
  typeFieldNames: string[]
) {
  if (enhanceConfig.class) {
    tslib.__decorate(enhanceConfig.class, typeClass);
  }
  if (enhanceConfig.fields) {
    const allFieldsDecorators = enhanceConfig.fields._all ?? [];
    for (const typeFieldName of typeFieldNames) {
      const maybeDecoratorsOrFn = enhanceConfig.fields[
        typeFieldName
      ] as PropertyDecorator[] | PropertyDecoratorOverrideFn | undefined;
      let decorators: PropertyDecorator[];
      if (typeof maybeDecoratorsOrFn === "function") {
        decorators = maybeDecoratorsOrFn(allFieldsDecorators);
      } else {
        decorators = [...allFieldsDecorators, ...maybeDecoratorsOrFn ?? []];
      }
      tslib.__decorate(decorators, typePrototype, typeFieldName, void 0);
    }
  }
}

const modelsInfo = {
  User: ["id", "email", "name", "followerIDs", "followingIDs", "likePostIDs"],
  Post: ["id", "title", "message", "authorId", "likeIDs", "tagIDs"],
  Comment: ["id", "message", "postId", "authorId"],
  Tag: ["id", "name", "postIDs"]
};

type ModelNames = keyof typeof models;

type ModelFieldNames<TModel extends ModelNames> = Exclude<
  keyof typeof models[TModel]["prototype"],
  number | symbol
>;

type ModelFieldsConfig<TModel extends ModelNames> = FieldsConfig<
  ModelFieldNames<TModel>
>;

export type ModelConfig<TModel extends ModelNames> = {
  class?: ClassDecorator[];
  fields?: ModelFieldsConfig<TModel>;
};

export type ModelsEnhanceMap = {
  [TModel in ModelNames]?: ModelConfig<TModel>;
};

export function applyModelsEnhanceMap(modelsEnhanceMap: ModelsEnhanceMap) {
  for (const modelsEnhanceMapKey of Object.keys(modelsEnhanceMap)) {
    const modelName = modelsEnhanceMapKey as keyof typeof modelsEnhanceMap;
    const modelConfig = modelsEnhanceMap[modelName]!;
    const modelClass = models[modelName];
    const modelTarget = modelClass.prototype;
    applyTypeClassEnhanceConfig(
      modelConfig,
      modelClass,
      modelTarget,
      modelsInfo[modelName as keyof typeof modelsInfo],
    );
  }
}

const outputsInfo = {
  AggregateUser: ["_count", "_min", "_max"],
  UserGroupBy: ["id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles", "_count", "_min", "_max"],
  AggregatePost: ["_count", "_min", "_max"],
  PostGroupBy: ["id", "title", "message", "authorId", "likeIDs", "tagIDs", "_count", "_min", "_max"],
  AggregateComment: ["_count", "_min", "_max"],
  CommentGroupBy: ["id", "message", "postId", "authorId", "_count", "_min", "_max"],
  AggregateTag: ["_count", "_min", "_max"],
  TagGroupBy: ["id", "name", "postIDs", "_count", "_min", "_max"],
  AffectedRowsOutput: ["count"],
  UserCount: ["followers", "following", "likePosts", "posts", "comments"],
  UserCountAggregate: ["id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles", "_all"],
  UserMinAggregate: ["id", "email", "name", "password"],
  UserMaxAggregate: ["id", "email", "name", "password"],
  PostCount: ["likes", "tags", "comments"],
  PostCountAggregate: ["id", "title", "message", "authorId", "likeIDs", "tagIDs", "_all"],
  PostMinAggregate: ["id", "title", "message", "authorId"],
  PostMaxAggregate: ["id", "title", "message", "authorId"],
  CommentCountAggregate: ["id", "message", "postId", "authorId", "_all"],
  CommentMinAggregate: ["id", "message", "postId", "authorId"],
  CommentMaxAggregate: ["id", "message", "postId", "authorId"],
  TagCount: ["posts"],
  TagCountAggregate: ["id", "name", "postIDs", "_all"],
  TagMinAggregate: ["id", "name"],
  TagMaxAggregate: ["id", "name"]
};

type OutputTypesNames = keyof typeof outputTypes;

type OutputTypeFieldNames<TOutput extends OutputTypesNames> = Exclude<
  keyof typeof outputTypes[TOutput]["prototype"],
  number | symbol
>;

type OutputTypeFieldsConfig<
  TOutput extends OutputTypesNames
> = FieldsConfig<OutputTypeFieldNames<TOutput>>;

export type OutputTypeConfig<TOutput extends OutputTypesNames> = {
  class?: ClassDecorator[];
  fields?: OutputTypeFieldsConfig<TOutput>;
};

export type OutputTypesEnhanceMap = {
  [TOutput in OutputTypesNames]?: OutputTypeConfig<TOutput>;
};

export function applyOutputTypesEnhanceMap(
  outputTypesEnhanceMap: OutputTypesEnhanceMap,
) {
  for (const outputTypeEnhanceMapKey of Object.keys(outputTypesEnhanceMap)) {
    const outputTypeName = outputTypeEnhanceMapKey as keyof typeof outputTypesEnhanceMap;
    const typeConfig = outputTypesEnhanceMap[outputTypeName]!;
    const typeClass = outputTypes[outputTypeName];
    const typeTarget = typeClass.prototype;
    applyTypeClassEnhanceConfig(
      typeConfig,
      typeClass,
      typeTarget,
      outputsInfo[outputTypeName as keyof typeof outputsInfo],
    );
  }
}

const inputsInfo = {
  UserWhereInput: ["AND", "OR", "NOT", "id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles", "followers", "following", "likePosts", "posts", "comments"],
  UserOrderByWithRelationInput: ["id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles", "followers", "following", "likePosts", "posts", "comments"],
  UserWhereUniqueInput: ["id", "email", "AND", "OR", "NOT", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles", "followers", "following", "likePosts", "posts", "comments"],
  UserOrderByWithAggregationInput: ["id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles", "_count", "_max", "_min"],
  UserScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  PostWhereInput: ["AND", "OR", "NOT", "id", "title", "message", "authorId", "likeIDs", "tagIDs", "author", "likes", "tags", "comments"],
  PostOrderByWithRelationInput: ["id", "title", "message", "authorId", "likeIDs", "tagIDs", "author", "likes", "tags", "comments"],
  PostWhereUniqueInput: ["id", "AND", "OR", "NOT", "title", "message", "authorId", "likeIDs", "tagIDs", "author", "likes", "tags", "comments"],
  PostOrderByWithAggregationInput: ["id", "title", "message", "authorId", "likeIDs", "tagIDs", "_count", "_max", "_min"],
  PostScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "title", "message", "authorId", "likeIDs", "tagIDs"],
  CommentWhereInput: ["AND", "OR", "NOT", "id", "message", "postId", "authorId", "port", "author"],
  CommentOrderByWithRelationInput: ["id", "message", "postId", "authorId", "port", "author"],
  CommentWhereUniqueInput: ["id", "AND", "OR", "NOT", "message", "postId", "authorId", "port", "author"],
  CommentOrderByWithAggregationInput: ["id", "message", "postId", "authorId", "_count", "_max", "_min"],
  CommentScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "message", "postId", "authorId"],
  TagWhereInput: ["AND", "OR", "NOT", "id", "name", "postIDs", "posts"],
  TagOrderByWithRelationInput: ["id", "name", "postIDs", "posts"],
  TagWhereUniqueInput: ["id", "AND", "OR", "NOT", "name", "postIDs", "posts"],
  TagOrderByWithAggregationInput: ["id", "name", "postIDs", "_count", "_max", "_min"],
  TagScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "name", "postIDs"],
  UserCreateInput: ["id", "email", "name", "password", "roles", "followers", "following", "likePosts", "posts", "comments"],
  UserUpdateInput: ["email", "name", "password", "roles", "followers", "following", "likePosts", "posts", "comments"],
  UserCreateManyInput: ["id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  UserUpdateManyMutationInput: ["email", "name", "password", "roles"],
  PostCreateInput: ["id", "title", "message", "author", "likes", "tags", "comments"],
  PostUpdateInput: ["title", "message", "author", "likes", "tags", "comments"],
  PostCreateManyInput: ["id", "title", "message", "authorId", "likeIDs", "tagIDs"],
  PostUpdateManyMutationInput: ["title", "message"],
  CommentCreateInput: ["id", "message", "port", "author"],
  CommentUpdateInput: ["message", "port", "author"],
  CommentCreateManyInput: ["id", "message", "postId", "authorId"],
  CommentUpdateManyMutationInput: ["message"],
  TagCreateInput: ["id", "name", "posts"],
  TagUpdateInput: ["name", "posts"],
  TagCreateManyInput: ["id", "name", "postIDs"],
  TagUpdateManyMutationInput: ["name"],
  StringFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not"],
  StringNullableFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not", "isSet"],
  StringNullableListFilter: ["equals", "has", "hasEvery", "hasSome", "isEmpty"],
  UserListRelationFilter: ["every", "some", "none"],
  PostListRelationFilter: ["every", "some", "none"],
  CommentListRelationFilter: ["every", "some", "none"],
  UserOrderByRelationAggregateInput: ["_count"],
  PostOrderByRelationAggregateInput: ["_count"],
  CommentOrderByRelationAggregateInput: ["_count"],
  UserCountOrderByAggregateInput: ["id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  UserMaxOrderByAggregateInput: ["id", "email", "name", "password"],
  UserMinOrderByAggregateInput: ["id", "email", "name", "password"],
  StringWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not", "_count", "_min", "_max"],
  StringNullableWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not", "_count", "_min", "_max", "isSet"],
  UserRelationFilter: ["is", "isNot"],
  TagListRelationFilter: ["every", "some", "none"],
  TagOrderByRelationAggregateInput: ["_count"],
  PostCountOrderByAggregateInput: ["id", "title", "message", "authorId", "likeIDs", "tagIDs"],
  PostMaxOrderByAggregateInput: ["id", "title", "message", "authorId"],
  PostMinOrderByAggregateInput: ["id", "title", "message", "authorId"],
  PostRelationFilter: ["is", "isNot"],
  CommentCountOrderByAggregateInput: ["id", "message", "postId", "authorId"],
  CommentMaxOrderByAggregateInput: ["id", "message", "postId", "authorId"],
  CommentMinOrderByAggregateInput: ["id", "message", "postId", "authorId"],
  TagCountOrderByAggregateInput: ["id", "name", "postIDs"],
  TagMaxOrderByAggregateInput: ["id", "name"],
  TagMinOrderByAggregateInput: ["id", "name"],
  UserCreaterolesInput: ["set"],
  UserCreateNestedManyWithoutFollowingInput: ["create", "connectOrCreate", "connect"],
  UserCreateNestedManyWithoutFollowersInput: ["create", "connectOrCreate", "connect"],
  PostCreateNestedManyWithoutLikesInput: ["create", "connectOrCreate", "connect"],
  PostCreateNestedManyWithoutAuthorInput: ["create", "connectOrCreate", "createMany", "connect"],
  CommentCreateNestedManyWithoutAuthorInput: ["create", "connectOrCreate", "createMany", "connect"],
  UserCreatefollowerIDsInput: ["set"],
  UserCreatefollowingIDsInput: ["set"],
  UserCreatelikePostIDsInput: ["set"],
  StringFieldUpdateOperationsInput: ["set"],
  NullableStringFieldUpdateOperationsInput: ["set", "unset"],
  UserUpdaterolesInput: ["set", "push"],
  UserUpdateManyWithoutFollowingNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  UserUpdateManyWithoutFollowersNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  PostUpdateManyWithoutLikesNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  PostUpdateManyWithoutAuthorNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  CommentUpdateManyWithoutAuthorNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  UserUpdatefollowerIDsInput: ["set", "push"],
  UserUpdatefollowingIDsInput: ["set", "push"],
  UserUpdatelikePostIDsInput: ["set", "push"],
  UserCreateNestedOneWithoutPostsInput: ["create", "connectOrCreate", "connect"],
  UserCreateNestedManyWithoutLikePostsInput: ["create", "connectOrCreate", "connect"],
  TagCreateNestedManyWithoutPostsInput: ["create", "connectOrCreate", "connect"],
  CommentCreateNestedManyWithoutPortInput: ["create", "connectOrCreate", "createMany", "connect"],
  PostCreatelikeIDsInput: ["set"],
  PostCreatetagIDsInput: ["set"],
  UserUpdateOneRequiredWithoutPostsNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  UserUpdateManyWithoutLikePostsNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  TagUpdateManyWithoutPostsNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  CommentUpdateManyWithoutPortNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  PostUpdatelikeIDsInput: ["set", "push"],
  PostUpdatetagIDsInput: ["set", "push"],
  PostCreateNestedOneWithoutCommentsInput: ["create", "connectOrCreate", "connect"],
  UserCreateNestedOneWithoutCommentsInput: ["create", "connectOrCreate", "connect"],
  PostUpdateOneRequiredWithoutCommentsNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  UserUpdateOneRequiredWithoutCommentsNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  PostCreateNestedManyWithoutTagsInput: ["create", "connectOrCreate", "connect"],
  TagCreatepostIDsInput: ["set"],
  PostUpdateManyWithoutTagsNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  TagUpdatepostIDsInput: ["set", "push"],
  NestedStringFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "not"],
  NestedStringNullableFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "not", "isSet"],
  NestedStringWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "not", "_count", "_min", "_max"],
  NestedIntFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not"],
  NestedStringNullableWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "not", "_count", "_min", "_max", "isSet"],
  NestedIntNullableFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not", "isSet"],
  UserCreateWithoutFollowingInput: ["id", "email", "name", "password", "roles", "followers", "likePosts", "posts", "comments"],
  UserCreateOrConnectWithoutFollowingInput: ["where", "create"],
  UserCreateWithoutFollowersInput: ["id", "email", "name", "password", "roles", "following", "likePosts", "posts", "comments"],
  UserCreateOrConnectWithoutFollowersInput: ["where", "create"],
  PostCreateWithoutLikesInput: ["id", "title", "message", "author", "tags", "comments"],
  PostCreateOrConnectWithoutLikesInput: ["where", "create"],
  PostCreateWithoutAuthorInput: ["id", "title", "message", "likes", "tags", "comments"],
  PostCreateOrConnectWithoutAuthorInput: ["where", "create"],
  PostCreateManyAuthorInputEnvelope: ["data"],
  CommentCreateWithoutAuthorInput: ["id", "message", "port"],
  CommentCreateOrConnectWithoutAuthorInput: ["where", "create"],
  CommentCreateManyAuthorInputEnvelope: ["data"],
  UserUpsertWithWhereUniqueWithoutFollowingInput: ["where", "update", "create"],
  UserUpdateWithWhereUniqueWithoutFollowingInput: ["where", "data"],
  UserUpdateManyWithWhereWithoutFollowingInput: ["where", "data"],
  UserScalarWhereInput: ["AND", "OR", "NOT", "id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  UserUpsertWithWhereUniqueWithoutFollowersInput: ["where", "update", "create"],
  UserUpdateWithWhereUniqueWithoutFollowersInput: ["where", "data"],
  UserUpdateManyWithWhereWithoutFollowersInput: ["where", "data"],
  PostUpsertWithWhereUniqueWithoutLikesInput: ["where", "update", "create"],
  PostUpdateWithWhereUniqueWithoutLikesInput: ["where", "data"],
  PostUpdateManyWithWhereWithoutLikesInput: ["where", "data"],
  PostScalarWhereInput: ["AND", "OR", "NOT", "id", "title", "message", "authorId", "likeIDs", "tagIDs"],
  PostUpsertWithWhereUniqueWithoutAuthorInput: ["where", "update", "create"],
  PostUpdateWithWhereUniqueWithoutAuthorInput: ["where", "data"],
  PostUpdateManyWithWhereWithoutAuthorInput: ["where", "data"],
  CommentUpsertWithWhereUniqueWithoutAuthorInput: ["where", "update", "create"],
  CommentUpdateWithWhereUniqueWithoutAuthorInput: ["where", "data"],
  CommentUpdateManyWithWhereWithoutAuthorInput: ["where", "data"],
  CommentScalarWhereInput: ["AND", "OR", "NOT", "id", "message", "postId", "authorId"],
  UserCreateWithoutPostsInput: ["id", "email", "name", "password", "roles", "followers", "following", "likePosts", "comments"],
  UserCreateOrConnectWithoutPostsInput: ["where", "create"],
  UserCreateWithoutLikePostsInput: ["id", "email", "name", "password", "roles", "followers", "following", "posts", "comments"],
  UserCreateOrConnectWithoutLikePostsInput: ["where", "create"],
  TagCreateWithoutPostsInput: ["id", "name"],
  TagCreateOrConnectWithoutPostsInput: ["where", "create"],
  CommentCreateWithoutPortInput: ["id", "message", "author"],
  CommentCreateOrConnectWithoutPortInput: ["where", "create"],
  CommentCreateManyPortInputEnvelope: ["data"],
  UserUpsertWithoutPostsInput: ["update", "create", "where"],
  UserUpdateToOneWithWhereWithoutPostsInput: ["where", "data"],
  UserUpdateWithoutPostsInput: ["email", "name", "password", "roles", "followers", "following", "likePosts", "comments"],
  UserUpsertWithWhereUniqueWithoutLikePostsInput: ["where", "update", "create"],
  UserUpdateWithWhereUniqueWithoutLikePostsInput: ["where", "data"],
  UserUpdateManyWithWhereWithoutLikePostsInput: ["where", "data"],
  TagUpsertWithWhereUniqueWithoutPostsInput: ["where", "update", "create"],
  TagUpdateWithWhereUniqueWithoutPostsInput: ["where", "data"],
  TagUpdateManyWithWhereWithoutPostsInput: ["where", "data"],
  TagScalarWhereInput: ["AND", "OR", "NOT", "id", "name", "postIDs"],
  CommentUpsertWithWhereUniqueWithoutPortInput: ["where", "update", "create"],
  CommentUpdateWithWhereUniqueWithoutPortInput: ["where", "data"],
  CommentUpdateManyWithWhereWithoutPortInput: ["where", "data"],
  PostCreateWithoutCommentsInput: ["id", "title", "message", "author", "likes", "tags"],
  PostCreateOrConnectWithoutCommentsInput: ["where", "create"],
  UserCreateWithoutCommentsInput: ["id", "email", "name", "password", "roles", "followers", "following", "likePosts", "posts"],
  UserCreateOrConnectWithoutCommentsInput: ["where", "create"],
  PostUpsertWithoutCommentsInput: ["update", "create", "where"],
  PostUpdateToOneWithWhereWithoutCommentsInput: ["where", "data"],
  PostUpdateWithoutCommentsInput: ["title", "message", "author", "likes", "tags"],
  UserUpsertWithoutCommentsInput: ["update", "create", "where"],
  UserUpdateToOneWithWhereWithoutCommentsInput: ["where", "data"],
  UserUpdateWithoutCommentsInput: ["email", "name", "password", "roles", "followers", "following", "likePosts", "posts"],
  PostCreateWithoutTagsInput: ["id", "title", "message", "author", "likes", "comments"],
  PostCreateOrConnectWithoutTagsInput: ["where", "create"],
  PostUpsertWithWhereUniqueWithoutTagsInput: ["where", "update", "create"],
  PostUpdateWithWhereUniqueWithoutTagsInput: ["where", "data"],
  PostUpdateManyWithWhereWithoutTagsInput: ["where", "data"],
  PostCreateManyAuthorInput: ["id", "title", "message", "likeIDs", "tagIDs"],
  CommentCreateManyAuthorInput: ["id", "message", "postId"],
  UserUpdateWithoutFollowingInput: ["email", "name", "password", "roles", "followers", "likePosts", "posts", "comments"],
  UserUpdateWithoutFollowersInput: ["email", "name", "password", "roles", "following", "likePosts", "posts", "comments"],
  PostUpdateWithoutLikesInput: ["title", "message", "author", "tags", "comments"],
  PostUpdateWithoutAuthorInput: ["title", "message", "likes", "tags", "comments"],
  CommentUpdateWithoutAuthorInput: ["message", "port"],
  CommentCreateManyPortInput: ["id", "message", "authorId"],
  UserUpdateWithoutLikePostsInput: ["email", "name", "password", "roles", "followers", "following", "posts", "comments"],
  TagUpdateWithoutPostsInput: ["name"],
  CommentUpdateWithoutPortInput: ["message", "author"],
  PostUpdateWithoutTagsInput: ["title", "message", "author", "likes", "comments"]
};

type InputTypesNames = keyof typeof inputTypes;

type InputTypeFieldNames<TInput extends InputTypesNames> = Exclude<
  keyof typeof inputTypes[TInput]["prototype"],
  number | symbol
>;

type InputTypeFieldsConfig<
  TInput extends InputTypesNames
> = FieldsConfig<InputTypeFieldNames<TInput>>;

export type InputTypeConfig<TInput extends InputTypesNames> = {
  class?: ClassDecorator[];
  fields?: InputTypeFieldsConfig<TInput>;
};

export type InputTypesEnhanceMap = {
  [TInput in InputTypesNames]?: InputTypeConfig<TInput>;
};

export function applyInputTypesEnhanceMap(
  inputTypesEnhanceMap: InputTypesEnhanceMap,
) {
  for (const inputTypeEnhanceMapKey of Object.keys(inputTypesEnhanceMap)) {
    const inputTypeName = inputTypeEnhanceMapKey as keyof typeof inputTypesEnhanceMap;
    const typeConfig = inputTypesEnhanceMap[inputTypeName]!;
    const typeClass = inputTypes[inputTypeName];
    const typeTarget = typeClass.prototype;
    applyTypeClassEnhanceConfig(
      typeConfig,
      typeClass,
      typeTarget,
      inputsInfo[inputTypeName as keyof typeof inputsInfo],
    );
  }
}

