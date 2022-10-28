import { ClassType } from "type-graphql";
import * as tslib from "tslib";
import * as crudResolvers from "./resolvers/crud/resolvers-crud.index";
import * as argsTypes from "./resolvers/crud/args.index";
import * as actionResolvers from "./resolvers/crud/resolvers-actions.index";
import * as relationResolvers from "./resolvers/relations/resolvers.index";
import * as models from "./models";
import * as outputTypes from "./resolvers/outputs";
import * as inputTypes from "./resolvers/inputs";

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
    users: actionResolvers.FindManyUserResolver,
    user: actionResolvers.FindUniqueUserResolver,
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
    posts: actionResolvers.FindManyPostResolver,
    post: actionResolvers.FindUniquePostResolver,
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
    comments: actionResolvers.FindManyCommentResolver,
    comment: actionResolvers.FindUniqueCommentResolver,
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
    tags: actionResolvers.FindManyTagResolver,
    tag: actionResolvers.FindUniqueTagResolver,
    groupByTag: actionResolvers.GroupByTagResolver,
    updateManyTag: actionResolvers.UpdateManyTagResolver,
    updateOneTag: actionResolvers.UpdateOneTagResolver,
    upsertOneTag: actionResolvers.UpsertOneTagResolver
  }
};
const crudResolversInfo = {
  User: ["aggregateUser", "createManyUser", "createOneUser", "deleteManyUser", "deleteOneUser", "findFirstUser", "users", "user", "groupByUser", "updateManyUser", "updateOneUser", "upsertOneUser"],
  Post: ["aggregatePost", "createManyPost", "createOnePost", "deleteManyPost", "deleteOnePost", "findFirstPost", "posts", "post", "groupByPost", "updateManyPost", "updateOnePost", "upsertOnePost"],
  Comment: ["aggregateComment", "createManyComment", "createOneComment", "deleteManyComment", "deleteOneComment", "findFirstComment", "comments", "comment", "groupByComment", "updateManyComment", "updateOneComment", "upsertOneComment"],
  Tag: ["aggregateTag", "createManyTag", "createOneTag", "deleteManyTag", "deleteOneTag", "findFirstTag", "tags", "tag", "groupByTag", "updateManyTag", "updateOneTag", "upsertOneTag"]
};
const argsInfo = {
  AggregateUserArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyUserArgs: ["data"],
  CreateOneUserArgs: ["data"],
  DeleteManyUserArgs: ["where"],
  DeleteOneUserArgs: ["where"],
  FindFirstUserArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyUserArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueUserArgs: ["where"],
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
  FindManyPostArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniquePostArgs: ["where"],
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
  FindManyCommentArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueCommentArgs: ["where"],
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
  FindManyTagArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueTagArgs: ["where"],
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
  > = Partial<Record<ModelResolverActionNames<TModel> | "_all", MethodDecorator[]>>;

export type ResolversEnhanceMap = {
  [TModel in ResolverModelNames]?: ResolverActionsConfig<TModel>;
};

export function applyResolversEnhanceMap(
  resolversEnhanceMap: ResolversEnhanceMap,
) {
  for (const resolversEnhanceMapKey of Object.keys(resolversEnhanceMap)) {
    const modelName = resolversEnhanceMapKey as keyof typeof resolversEnhanceMap;
    const crudTarget = crudResolversMap[modelName].prototype;
    const resolverActionsConfig = resolversEnhanceMap[modelName]!;
    const actionResolversConfig = actionResolversMap[modelName];
    if (resolverActionsConfig._all) {
      const allActionsDecorators = resolverActionsConfig._all;
      const resolverActionNames = crudResolversInfo[modelName as keyof typeof crudResolversInfo];
      for (const resolverActionName of resolverActionNames) {
        const actionTarget = (actionResolversConfig[
          resolverActionName as keyof typeof actionResolversConfig
        ] as Function).prototype;
        tslib.__decorate(allActionsDecorators, crudTarget, resolverActionName, null);
        tslib.__decorate(allActionsDecorators, actionTarget, resolverActionName, null);
      }
    }
    const resolverActionsToApply = Object.keys(resolverActionsConfig).filter(
      it => it !== "_all"
    );
    for (const resolverActionName of resolverActionsToApply) {
      const decorators = resolverActionsConfig[
        resolverActionName as keyof typeof resolverActionsConfig
      ] as MethodDecorator[];
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
  = Partial<Record<RelationResolverActionNames<TModel> | "_all", MethodDecorator[]>>;

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
    if (relationResolverActionsConfig._all) {
      const allActionsDecorators = relationResolverActionsConfig._all;
      const relationResolverActionNames = relationResolversInfo[modelName as keyof typeof relationResolversInfo];
      for (const relationResolverActionName of relationResolverActionNames) {
        tslib.__decorate(allActionsDecorators, relationResolverTarget, relationResolverActionName, null);
      }
    }
    const relationResolverActionsToApply = Object.keys(relationResolverActionsConfig).filter(
      it => it !== "_all"
    );
    for (const relationResolverActionName of relationResolverActionsToApply) {
      const decorators = relationResolverActionsConfig[
        relationResolverActionName as keyof typeof relationResolverActionsConfig
      ] as MethodDecorator[];
      tslib.__decorate(decorators, relationResolverTarget, relationResolverActionName, null);
    }
  }
}

type TypeConfig = {
  class?: ClassDecorator[];
  fields?: FieldsConfig;
};

type FieldsConfig<TTypeKeys extends string = string> = Partial<
  Record<TTypeKeys | "_all", PropertyDecorator[]>
>;

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
    if (enhanceConfig.fields._all) {
      const allFieldsDecorators = enhanceConfig.fields._all;
      for (const typeFieldName of typeFieldNames) {
        tslib.__decorate(allFieldsDecorators, typePrototype, typeFieldName, void 0);
      }
    }
    const configFieldsToApply = Object.keys(enhanceConfig.fields).filter(
      it => it !== "_all"
    );
    for (const typeFieldName of configFieldsToApply) {
      const fieldDecorators = enhanceConfig.fields[typeFieldName]!;
      tslib.__decorate(fieldDecorators, typePrototype, typeFieldName, void 0);
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
  UserWhereInput: ["AND", "OR", "NOT", "id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  UserOrderByWithRelationInput: ["id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  UserWhereUniqueInput: ["id", "email"],
  UserOrderByWithAggregationInput: ["id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles", "_count", "_max", "_min"],
  UserScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  PostWhereInput: ["AND", "OR", "NOT", "id", "title", "message", "author", "authorId", "likes", "likeIDs", "tags", "tagIDs", "comments"],
  PostOrderByWithRelationInput: ["id", "title", "message", "author", "authorId", "likes", "likeIDs", "tags", "tagIDs", "comments"],
  PostWhereUniqueInput: ["id"],
  PostOrderByWithAggregationInput: ["id", "title", "message", "authorId", "likeIDs", "tagIDs", "_count", "_max", "_min"],
  PostScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "title", "message", "authorId", "likeIDs", "tagIDs"],
  CommentWhereInput: ["AND", "OR", "NOT", "id", "message", "port", "postId", "author", "authorId"],
  CommentOrderByWithRelationInput: ["id", "message", "port", "postId", "author", "authorId"],
  CommentWhereUniqueInput: ["id"],
  CommentOrderByWithAggregationInput: ["id", "message", "postId", "authorId", "_count", "_max", "_min"],
  CommentScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "message", "postId", "authorId"],
  TagWhereInput: ["AND", "OR", "NOT", "id", "name", "posts", "postIDs"],
  TagOrderByWithRelationInput: ["id", "name", "posts", "postIDs"],
  TagWhereUniqueInput: ["id"],
  TagOrderByWithAggregationInput: ["id", "name", "postIDs", "_count", "_max", "_min"],
  TagScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "name", "postIDs"],
  UserCreateInput: ["id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  UserUpdateInput: ["email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  UserCreateManyInput: ["id", "email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  UserUpdateManyMutationInput: ["email", "name", "password", "followerIDs", "followingIDs", "likePostIDs", "roles"],
  PostCreateInput: ["id", "title", "message", "author", "likes", "likeIDs", "tags", "tagIDs", "comments"],
  PostUpdateInput: ["title", "message", "author", "likes", "likeIDs", "tags", "tagIDs", "comments"],
  PostCreateManyInput: ["id", "title", "message", "authorId", "likeIDs", "tagIDs"],
  PostUpdateManyMutationInput: ["title", "message", "likeIDs", "tagIDs"],
  CommentCreateInput: ["id", "message", "port", "author"],
  CommentUpdateInput: ["message", "port", "author"],
  CommentCreateManyInput: ["id", "message", "postId", "authorId"],
  CommentUpdateManyMutationInput: ["message"],
  TagCreateInput: ["id", "name", "posts", "postIDs"],
  TagUpdateInput: ["name", "posts", "postIDs"],
  TagCreateManyInput: ["id", "name", "postIDs"],
  TagUpdateManyMutationInput: ["name", "postIDs"],
  StringFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not"],
  StringNullableFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not", "isSet"],
  UserListRelationFilter: ["every", "some", "none"],
  StringNullableListFilter: ["equals", "has", "hasEvery", "hasSome", "isEmpty"],
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
  UserCreateNestedManyWithoutFollowingInput: ["create", "connectOrCreate", "connect"],
  UserCreatefollowerIDsInput: ["set"],
  UserCreateNestedManyWithoutFollowersInput: ["create", "connectOrCreate", "connect"],
  UserCreatefollowingIDsInput: ["set"],
  PostCreateNestedManyWithoutLikesInput: ["create", "connectOrCreate", "connect"],
  UserCreatelikePostIDsInput: ["set"],
  PostCreateNestedManyWithoutAuthorInput: ["create", "connectOrCreate", "createMany", "connect"],
  CommentCreateNestedManyWithoutAuthorInput: ["create", "connectOrCreate", "createMany", "connect"],
  UserCreaterolesInput: ["set"],
  StringFieldUpdateOperationsInput: ["set"],
  NullableStringFieldUpdateOperationsInput: ["set", "unset"],
  UserUpdateManyWithoutFollowingNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  UserUpdatefollowerIDsInput: ["set", "push"],
  UserUpdateManyWithoutFollowersNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  UserUpdatefollowingIDsInput: ["set", "push"],
  PostUpdateManyWithoutLikesNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  UserUpdatelikePostIDsInput: ["set", "push"],
  PostUpdateManyWithoutAuthorNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  CommentUpdateManyWithoutAuthorNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  UserUpdaterolesInput: ["set", "push"],
  UserCreateNestedOneWithoutPostsInput: ["create", "connectOrCreate", "connect"],
  UserCreateNestedManyWithoutLikePostsInput: ["create", "connectOrCreate", "connect"],
  PostCreatelikeIDsInput: ["set"],
  TagCreateNestedManyWithoutPostsInput: ["create", "connectOrCreate", "connect"],
  PostCreatetagIDsInput: ["set"],
  CommentCreateNestedManyWithoutPortInput: ["create", "connectOrCreate", "createMany", "connect"],
  UserUpdateOneRequiredWithoutPostsNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  UserUpdateManyWithoutLikePostsNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  PostUpdatelikeIDsInput: ["set", "push"],
  TagUpdateManyWithoutPostsNestedInput: ["create", "connectOrCreate", "upsert", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  PostUpdatetagIDsInput: ["set", "push"],
  CommentUpdateManyWithoutPortNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
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
  UserCreateWithoutFollowingInput: ["id", "email", "name", "password", "followers", "followerIDs", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  UserCreateOrConnectWithoutFollowingInput: ["where", "create"],
  UserCreateWithoutFollowersInput: ["id", "email", "name", "password", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  UserCreateOrConnectWithoutFollowersInput: ["where", "create"],
  PostCreateWithoutLikesInput: ["id", "title", "message", "author", "likeIDs", "tags", "tagIDs", "comments"],
  PostCreateOrConnectWithoutLikesInput: ["where", "create"],
  PostCreateWithoutAuthorInput: ["id", "title", "message", "likes", "likeIDs", "tags", "tagIDs", "comments"],
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
  UserCreateWithoutPostsInput: ["id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "comments", "roles"],
  UserCreateOrConnectWithoutPostsInput: ["where", "create"],
  UserCreateWithoutLikePostsInput: ["id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePostIDs", "posts", "comments", "roles"],
  UserCreateOrConnectWithoutLikePostsInput: ["where", "create"],
  TagCreateWithoutPostsInput: ["id", "name", "postIDs"],
  TagCreateOrConnectWithoutPostsInput: ["where", "create"],
  CommentCreateWithoutPortInput: ["id", "message", "author"],
  CommentCreateOrConnectWithoutPortInput: ["where", "create"],
  CommentCreateManyPortInputEnvelope: ["data"],
  UserUpsertWithoutPostsInput: ["update", "create"],
  UserUpdateWithoutPostsInput: ["email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "comments", "roles"],
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
  PostCreateWithoutCommentsInput: ["id", "title", "message", "author", "likes", "likeIDs", "tags", "tagIDs"],
  PostCreateOrConnectWithoutCommentsInput: ["where", "create"],
  UserCreateWithoutCommentsInput: ["id", "email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "roles"],
  UserCreateOrConnectWithoutCommentsInput: ["where", "create"],
  PostUpsertWithoutCommentsInput: ["update", "create"],
  PostUpdateWithoutCommentsInput: ["title", "message", "author", "likes", "likeIDs", "tags", "tagIDs"],
  UserUpsertWithoutCommentsInput: ["update", "create"],
  UserUpdateWithoutCommentsInput: ["email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "roles"],
  PostCreateWithoutTagsInput: ["id", "title", "message", "author", "likes", "likeIDs", "tagIDs", "comments"],
  PostCreateOrConnectWithoutTagsInput: ["where", "create"],
  PostUpsertWithWhereUniqueWithoutTagsInput: ["where", "update", "create"],
  PostUpdateWithWhereUniqueWithoutTagsInput: ["where", "data"],
  PostUpdateManyWithWhereWithoutTagsInput: ["where", "data"],
  PostCreateManyAuthorInput: ["id", "title", "message", "likeIDs", "tagIDs"],
  CommentCreateManyAuthorInput: ["id", "message", "postId"],
  UserUpdateWithoutFollowingInput: ["email", "name", "password", "followers", "followerIDs", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  UserUpdateWithoutFollowersInput: ["email", "name", "password", "followerIDs", "following", "followingIDs", "likePosts", "likePostIDs", "posts", "comments", "roles"],
  PostUpdateWithoutLikesInput: ["title", "message", "author", "likeIDs", "tags", "tagIDs", "comments"],
  PostUpdateWithoutAuthorInput: ["title", "message", "likes", "likeIDs", "tags", "tagIDs", "comments"],
  CommentUpdateWithoutAuthorInput: ["message", "port"],
  CommentCreateManyPortInput: ["id", "message", "authorId"],
  UserUpdateWithoutLikePostsInput: ["email", "name", "password", "followers", "followerIDs", "following", "followingIDs", "likePostIDs", "posts", "comments", "roles"],
  TagUpdateWithoutPostsInput: ["name", "postIDs"],
  CommentUpdateWithoutPortInput: ["message", "author"],
  PostUpdateWithoutTagsInput: ["title", "message", "author", "likes", "likeIDs", "tagIDs", "comments"]
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

