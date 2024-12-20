/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
/* istanbul ignore file */
// noinspection JSUnusedGlobalSymbols ,JSUnnecessarySemicolon 

//@ts-nocheck
import {DocumentNode} from 'graphql';
import gql from 'graphql-tag';
import * as Urql from '@urql/vue';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type {DocumentNode};
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AffectedRowsOutput = {
  __typename?: 'AffectedRowsOutput';
  count: Scalars['Int']['output'];
};

export type AggregateComment = {
  __typename?: 'AggregateComment';
  _count?: Maybe<CommentCountAggregate>;
  _max?: Maybe<CommentMaxAggregate>;
  _min?: Maybe<CommentMinAggregate>;
};

export type AggregatePost = {
  __typename?: 'AggregatePost';
  _count?: Maybe<PostCountAggregate>;
  _max?: Maybe<PostMaxAggregate>;
  _min?: Maybe<PostMinAggregate>;
};

export type AggregateTag = {
  __typename?: 'AggregateTag';
  _count?: Maybe<TagCountAggregate>;
  _max?: Maybe<TagMaxAggregate>;
  _min?: Maybe<TagMinAggregate>;
};

export type AggregateUser = {
  __typename?: 'AggregateUser';
  _count?: Maybe<UserCountAggregate>;
  _max?: Maybe<UserMaxAggregate>;
  _min?: Maybe<UserMinAggregate>;
};

/** user and auth token */
export type AuthUser = {
  __typename?: 'AuthUser';
  _count?: Maybe<UserCount>;
  comments: Array<Comment>;
  email: Scalars['String']['output'];
  followerIDs: Array<Scalars['String']['output']>;
  followers: Array<User>;
  following: Array<User>;
  followingIDs: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  likePostIDs: Array<Scalars['String']['output']>;
  likePosts: Array<Post>;
  name?: Maybe<Scalars['String']['output']>;
  posts: Array<Post>;
  /** jwt token */
  token: Scalars['String']['output'];
};


/** user and auth token */
export type AuthUserCommentsArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<Array<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CommentWhereInput>;
};


/** user and auth token */
export type AuthUserFollowersArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<Array<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};


/** user and auth token */
export type AuthUserFollowingArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<Array<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};


/** user and auth token */
export type AuthUserLikePostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<Array<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};


/** user and auth token */
export type AuthUserPostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<Array<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};

export type Comment = {
  __typename?: 'Comment';
  author: User;
  authorId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  message: Scalars['String']['output'];
  port: Post;
  postId: Scalars['String']['output'];
};

export type CommentCountAggregate = {
  __typename?: 'CommentCountAggregate';
  _all: Scalars['Int']['output'];
  authorId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  message: Scalars['Int']['output'];
  postId: Scalars['Int']['output'];
};

export type CommentCountOrderByAggregateInput = {
  authorId?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  message?: InputMaybe<SortOrder>;
  postId?: InputMaybe<SortOrder>;
};

export type CommentCreateInput = {
  author: UserCreateNestedOneWithoutCommentsInput;
  id?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
  port: PostCreateNestedOneWithoutCommentsInput;
};

export type CommentCreateManyAuthorInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
  postId: Scalars['String']['input'];
};

export type CommentCreateManyAuthorInputEnvelope = {
  data: Array<CommentCreateManyAuthorInput>;
};

export type CommentCreateManyInput = {
  authorId: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
  postId: Scalars['String']['input'];
};

export type CommentCreateManyPortInput = {
  authorId: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
};

export type CommentCreateManyPortInputEnvelope = {
  data: Array<CommentCreateManyPortInput>;
};

export type CommentCreateNestedManyWithoutAuthorInput = {
  connect?: InputMaybe<Array<CommentWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<CommentCreateOrConnectWithoutAuthorInput>>;
  create?: InputMaybe<Array<CommentCreateWithoutAuthorInput>>;
  createMany?: InputMaybe<CommentCreateManyAuthorInputEnvelope>;
};

export type CommentCreateNestedManyWithoutPortInput = {
  connect?: InputMaybe<Array<CommentWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<CommentCreateOrConnectWithoutPortInput>>;
  create?: InputMaybe<Array<CommentCreateWithoutPortInput>>;
  createMany?: InputMaybe<CommentCreateManyPortInputEnvelope>;
};

export type CommentCreateOrConnectWithoutAuthorInput = {
  create: CommentCreateWithoutAuthorInput;
  where: CommentWhereUniqueInput;
};

export type CommentCreateOrConnectWithoutPortInput = {
  create: CommentCreateWithoutPortInput;
  where: CommentWhereUniqueInput;
};

export type CommentCreateWithoutAuthorInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
  port: PostCreateNestedOneWithoutCommentsInput;
};

export type CommentCreateWithoutPortInput = {
  author: UserCreateNestedOneWithoutCommentsInput;
  id?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
};

export type CommentGroupBy = {
  __typename?: 'CommentGroupBy';
  _count?: Maybe<CommentCountAggregate>;
  _max?: Maybe<CommentMaxAggregate>;
  _min?: Maybe<CommentMinAggregate>;
  authorId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  message: Scalars['String']['output'];
  postId: Scalars['String']['output'];
};

export type CommentListRelationFilter = {
  every?: InputMaybe<CommentWhereInput>;
  none?: InputMaybe<CommentWhereInput>;
  some?: InputMaybe<CommentWhereInput>;
};

export type CommentMaxAggregate = {
  __typename?: 'CommentMaxAggregate';
  authorId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  postId?: Maybe<Scalars['String']['output']>;
};

export type CommentMaxOrderByAggregateInput = {
  authorId?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  message?: InputMaybe<SortOrder>;
  postId?: InputMaybe<SortOrder>;
};

export type CommentMinAggregate = {
  __typename?: 'CommentMinAggregate';
  authorId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  postId?: Maybe<Scalars['String']['output']>;
};

export type CommentMinOrderByAggregateInput = {
  authorId?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  message?: InputMaybe<SortOrder>;
  postId?: InputMaybe<SortOrder>;
};

export type CommentOrderByRelationAggregateInput = {
  _count?: InputMaybe<SortOrder>;
};

export type CommentOrderByWithAggregationInput = {
  _count?: InputMaybe<CommentCountOrderByAggregateInput>;
  _max?: InputMaybe<CommentMaxOrderByAggregateInput>;
  _min?: InputMaybe<CommentMinOrderByAggregateInput>;
  authorId?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  message?: InputMaybe<SortOrder>;
  postId?: InputMaybe<SortOrder>;
};

export type CommentOrderByWithRelationInput = {
  author?: InputMaybe<UserOrderByWithRelationInput>;
  authorId?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  message?: InputMaybe<SortOrder>;
  port?: InputMaybe<PostOrderByWithRelationInput>;
  postId?: InputMaybe<SortOrder>;
};

export enum CommentScalarFieldEnum {
  AuthorId = 'authorId',
  Id = 'id',
  Message = 'message',
  PostId = 'postId'
}

export type CommentScalarWhereInput = {
  AND?: InputMaybe<Array<CommentScalarWhereInput>>;
  NOT?: InputMaybe<Array<CommentScalarWhereInput>>;
  OR?: InputMaybe<Array<CommentScalarWhereInput>>;
  authorId?: InputMaybe<StringFilter>;
  id?: InputMaybe<StringFilter>;
  message?: InputMaybe<StringFilter>;
  postId?: InputMaybe<StringFilter>;
};

export type CommentScalarWhereWithAggregatesInput = {
  AND?: InputMaybe<Array<CommentScalarWhereWithAggregatesInput>>;
  NOT?: InputMaybe<Array<CommentScalarWhereWithAggregatesInput>>;
  OR?: InputMaybe<Array<CommentScalarWhereWithAggregatesInput>>;
  authorId?: InputMaybe<StringWithAggregatesFilter>;
  id?: InputMaybe<StringWithAggregatesFilter>;
  message?: InputMaybe<StringWithAggregatesFilter>;
  postId?: InputMaybe<StringWithAggregatesFilter>;
};

export type CommentUpdateInput = {
  author?: InputMaybe<UserUpdateOneRequiredWithoutCommentsNestedInput>;
  message?: InputMaybe<StringFieldUpdateOperationsInput>;
  port?: InputMaybe<PostUpdateOneRequiredWithoutCommentsNestedInput>;
};

export type CommentUpdateManyMutationInput = {
  message?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type CommentUpdateManyWithWhereWithoutAuthorInput = {
  data: CommentUpdateManyMutationInput;
  where: CommentScalarWhereInput;
};

export type CommentUpdateManyWithWhereWithoutPortInput = {
  data: CommentUpdateManyMutationInput;
  where: CommentScalarWhereInput;
};

export type CommentUpdateManyWithoutAuthorNestedInput = {
  connect?: InputMaybe<Array<CommentWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<CommentCreateOrConnectWithoutAuthorInput>>;
  create?: InputMaybe<Array<CommentCreateWithoutAuthorInput>>;
  createMany?: InputMaybe<CommentCreateManyAuthorInputEnvelope>;
  delete?: InputMaybe<Array<CommentWhereUniqueInput>>;
  deleteMany?: InputMaybe<Array<CommentScalarWhereInput>>;
  disconnect?: InputMaybe<Array<CommentWhereUniqueInput>>;
  set?: InputMaybe<Array<CommentWhereUniqueInput>>;
  update?: InputMaybe<Array<CommentUpdateWithWhereUniqueWithoutAuthorInput>>;
  updateMany?: InputMaybe<Array<CommentUpdateManyWithWhereWithoutAuthorInput>>;
  upsert?: InputMaybe<Array<CommentUpsertWithWhereUniqueWithoutAuthorInput>>;
};

export type CommentUpdateManyWithoutPortNestedInput = {
  connect?: InputMaybe<Array<CommentWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<CommentCreateOrConnectWithoutPortInput>>;
  create?: InputMaybe<Array<CommentCreateWithoutPortInput>>;
  createMany?: InputMaybe<CommentCreateManyPortInputEnvelope>;
  delete?: InputMaybe<Array<CommentWhereUniqueInput>>;
  deleteMany?: InputMaybe<Array<CommentScalarWhereInput>>;
  disconnect?: InputMaybe<Array<CommentWhereUniqueInput>>;
  set?: InputMaybe<Array<CommentWhereUniqueInput>>;
  update?: InputMaybe<Array<CommentUpdateWithWhereUniqueWithoutPortInput>>;
  updateMany?: InputMaybe<Array<CommentUpdateManyWithWhereWithoutPortInput>>;
  upsert?: InputMaybe<Array<CommentUpsertWithWhereUniqueWithoutPortInput>>;
};

export type CommentUpdateWithWhereUniqueWithoutAuthorInput = {
  data: CommentUpdateWithoutAuthorInput;
  where: CommentWhereUniqueInput;
};

export type CommentUpdateWithWhereUniqueWithoutPortInput = {
  data: CommentUpdateWithoutPortInput;
  where: CommentWhereUniqueInput;
};

export type CommentUpdateWithoutAuthorInput = {
  message?: InputMaybe<StringFieldUpdateOperationsInput>;
  port?: InputMaybe<PostUpdateOneRequiredWithoutCommentsNestedInput>;
};

export type CommentUpdateWithoutPortInput = {
  author?: InputMaybe<UserUpdateOneRequiredWithoutCommentsNestedInput>;
  message?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type CommentUpsertWithWhereUniqueWithoutAuthorInput = {
  create: CommentCreateWithoutAuthorInput;
  update: CommentUpdateWithoutAuthorInput;
  where: CommentWhereUniqueInput;
};

export type CommentUpsertWithWhereUniqueWithoutPortInput = {
  create: CommentCreateWithoutPortInput;
  update: CommentUpdateWithoutPortInput;
  where: CommentWhereUniqueInput;
};

export type CommentWhereInput = {
  AND?: InputMaybe<Array<CommentWhereInput>>;
  NOT?: InputMaybe<Array<CommentWhereInput>>;
  OR?: InputMaybe<Array<CommentWhereInput>>;
  author?: InputMaybe<UserRelationFilter>;
  authorId?: InputMaybe<StringFilter>;
  id?: InputMaybe<StringFilter>;
  message?: InputMaybe<StringFilter>;
  port?: InputMaybe<PostRelationFilter>;
  postId?: InputMaybe<StringFilter>;
};

export type CommentWhereUniqueInput = {
  id?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createManyComment: AffectedRowsOutput;
  createManyPost: AffectedRowsOutput;
  createManyTag: AffectedRowsOutput;
  createManyUser: AffectedRowsOutput;
  createOneComment: Comment;
  createOnePost: Post;
  createOneTag: Tag;
  createOneUser: User;
  deleteManyComment: AffectedRowsOutput;
  deleteManyPost: AffectedRowsOutput;
  deleteManyTag: AffectedRowsOutput;
  deleteManyUser: AffectedRowsOutput;
  deleteOneComment?: Maybe<Comment>;
  deleteOnePost?: Maybe<Post>;
  deleteOneTag?: Maybe<Tag>;
  deleteOneUser?: Maybe<User>;
  signIn?: Maybe<AuthUser>;
  signUp?: Maybe<AuthUser>;
  updateManyComment: AffectedRowsOutput;
  updateManyPost: AffectedRowsOutput;
  updateManyTag: AffectedRowsOutput;
  updateManyUser: AffectedRowsOutput;
  updateOneComment?: Maybe<Comment>;
  updateOnePost?: Maybe<Post>;
  updateOneTag?: Maybe<Tag>;
  updateOneUser?: Maybe<User>;
  updateTest: Test;
  upsertOneComment: Comment;
  upsertOnePost: Post;
  upsertOneTag: Tag;
  upsertOneUser: User;
};


export type MutationCreateManyCommentArgs = {
  data: Array<CommentCreateManyInput>;
};


export type MutationCreateManyPostArgs = {
  data: Array<PostCreateManyInput>;
};


export type MutationCreateManyTagArgs = {
  data: Array<TagCreateManyInput>;
};


export type MutationCreateManyUserArgs = {
  data: Array<UserCreateManyInput>;
};


export type MutationCreateOneCommentArgs = {
  data: CommentCreateInput;
};


export type MutationCreateOnePostArgs = {
  data: PostCreateInput;
};


export type MutationCreateOneTagArgs = {
  data: TagCreateInput;
};


export type MutationCreateOneUserArgs = {
  data: UserCreateInput;
};


export type MutationDeleteManyCommentArgs = {
  where?: InputMaybe<CommentWhereInput>;
};


export type MutationDeleteManyPostArgs = {
  where?: InputMaybe<PostWhereInput>;
};


export type MutationDeleteManyTagArgs = {
  where?: InputMaybe<TagWhereInput>;
};


export type MutationDeleteManyUserArgs = {
  where?: InputMaybe<UserWhereInput>;
};


export type MutationDeleteOneCommentArgs = {
  where: CommentWhereUniqueInput;
};


export type MutationDeleteOnePostArgs = {
  where: PostWhereUniqueInput;
};


export type MutationDeleteOneTagArgs = {
  where: TagWhereUniqueInput;
};


export type MutationDeleteOneUserArgs = {
  where: UserWhereUniqueInput;
};


export type MutationSignInArgs = {
  data: SignInInput;
};


export type MutationSignUpArgs = {
  data: SignUpInput;
};


export type MutationUpdateManyCommentArgs = {
  data: CommentUpdateManyMutationInput;
  where?: InputMaybe<CommentWhereInput>;
};


export type MutationUpdateManyPostArgs = {
  data: PostUpdateManyMutationInput;
  where?: InputMaybe<PostWhereInput>;
};


export type MutationUpdateManyTagArgs = {
  data: TagUpdateManyMutationInput;
  where?: InputMaybe<TagWhereInput>;
};


export type MutationUpdateManyUserArgs = {
  data: UserUpdateManyMutationInput;
  where?: InputMaybe<UserWhereInput>;
};


export type MutationUpdateOneCommentArgs = {
  data: CommentUpdateInput;
  where: CommentWhereUniqueInput;
};


export type MutationUpdateOnePostArgs = {
  data: PostUpdateInput;
  where: PostWhereUniqueInput;
};


export type MutationUpdateOneTagArgs = {
  data: TagUpdateInput;
  where: TagWhereUniqueInput;
};


export type MutationUpdateOneUserArgs = {
  data: UserUpdateInput;
  where: UserWhereUniqueInput;
};


export type MutationUpdateTestArgs = {
  name: Scalars['String']['input'];
};


export type MutationUpsertOneCommentArgs = {
  create: CommentCreateInput;
  update: CommentUpdateInput;
  where: CommentWhereUniqueInput;
};


export type MutationUpsertOnePostArgs = {
  create: PostCreateInput;
  update: PostUpdateInput;
  where: PostWhereUniqueInput;
};


export type MutationUpsertOneTagArgs = {
  create: TagCreateInput;
  update: TagUpdateInput;
  where: TagWhereUniqueInput;
};


export type MutationUpsertOneUserArgs = {
  create: UserCreateInput;
  update: UserUpdateInput;
  where: UserWhereUniqueInput;
};

export type NestedIntFilter = {
  equals?: InputMaybe<Scalars['Int']['input']>;
  gt?: InputMaybe<Scalars['Int']['input']>;
  gte?: InputMaybe<Scalars['Int']['input']>;
  in?: InputMaybe<Array<Scalars['Int']['input']>>;
  lt?: InputMaybe<Scalars['Int']['input']>;
  lte?: InputMaybe<Scalars['Int']['input']>;
  not?: InputMaybe<NestedIntFilter>;
  notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type NestedIntNullableFilter = {
  equals?: InputMaybe<Scalars['Int']['input']>;
  gt?: InputMaybe<Scalars['Int']['input']>;
  gte?: InputMaybe<Scalars['Int']['input']>;
  in?: InputMaybe<Array<Scalars['Int']['input']>>;
  isSet?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['Int']['input']>;
  lte?: InputMaybe<Scalars['Int']['input']>;
  not?: InputMaybe<NestedIntNullableFilter>;
  notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type NestedStringFilter = {
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  equals?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  not?: InputMaybe<NestedStringFilter>;
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type NestedStringNullableFilter = {
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  equals?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isSet?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  not?: InputMaybe<NestedStringNullableFilter>;
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type NestedStringNullableWithAggregatesFilter = {
  _count?: InputMaybe<NestedIntNullableFilter>;
  _max?: InputMaybe<NestedStringNullableFilter>;
  _min?: InputMaybe<NestedStringNullableFilter>;
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  equals?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isSet?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  not?: InputMaybe<NestedStringNullableWithAggregatesFilter>;
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type NestedStringWithAggregatesFilter = {
  _count?: InputMaybe<NestedIntFilter>;
  _max?: InputMaybe<NestedStringFilter>;
  _min?: InputMaybe<NestedStringFilter>;
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  equals?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  not?: InputMaybe<NestedStringWithAggregatesFilter>;
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type NullableStringFieldUpdateOperationsInput = {
  set?: InputMaybe<Scalars['String']['input']>;
  unset?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Post = {
  __typename?: 'Post';
  _count?: Maybe<PostCount>;
  author: User;
  authorId: Scalars['String']['output'];
  comments: Array<Comment>;
  id: Scalars['String']['output'];
  likeIDs: Array<Scalars['String']['output']>;
  likes: Array<User>;
  message?: Maybe<Scalars['String']['output']>;
  tagIDs: Array<Scalars['String']['output']>;
  tags: Array<Tag>;
  title: Scalars['String']['output'];
};


export type PostCommentsArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<Array<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type PostLikesArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<Array<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};


export type PostTagsArgs = {
  cursor?: InputMaybe<TagWhereUniqueInput>;
  distinct?: InputMaybe<Array<TagScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<TagOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<TagWhereInput>;
};

export type PostCount = {
  __typename?: 'PostCount';
  comments: Scalars['Int']['output'];
  likes: Scalars['Int']['output'];
  tags: Scalars['Int']['output'];
};

export type PostCountAggregate = {
  __typename?: 'PostCountAggregate';
  _all: Scalars['Int']['output'];
  authorId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  likeIDs: Scalars['Int']['output'];
  message: Scalars['Int']['output'];
  tagIDs: Scalars['Int']['output'];
  title: Scalars['Int']['output'];
};

export type PostCountOrderByAggregateInput = {
  authorId?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  likeIDs?: InputMaybe<SortOrder>;
  message?: InputMaybe<SortOrder>;
  tagIDs?: InputMaybe<SortOrder>;
  title?: InputMaybe<SortOrder>;
};

export type PostCreateInput = {
  author: UserCreateNestedOneWithoutPostsInput;
  comments?: InputMaybe<CommentCreateNestedManyWithoutPortInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  likes?: InputMaybe<UserCreateNestedManyWithoutLikePostsInput>;
  message?: InputMaybe<Scalars['String']['input']>;
  tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  tags?: InputMaybe<TagCreateNestedManyWithoutPostsInput>;
  title: Scalars['String']['input'];
};

export type PostCreateManyAuthorInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  message?: InputMaybe<Scalars['String']['input']>;
  tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  title: Scalars['String']['input'];
};

export type PostCreateManyAuthorInputEnvelope = {
  data: Array<PostCreateManyAuthorInput>;
};

export type PostCreateManyInput = {
  authorId: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  message?: InputMaybe<Scalars['String']['input']>;
  tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  title: Scalars['String']['input'];
};

export type PostCreateNestedManyWithoutAuthorInput = {
  connect?: InputMaybe<Array<PostWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<PostCreateOrConnectWithoutAuthorInput>>;
  create?: InputMaybe<Array<PostCreateWithoutAuthorInput>>;
  createMany?: InputMaybe<PostCreateManyAuthorInputEnvelope>;
};

export type PostCreateNestedManyWithoutLikesInput = {
  connect?: InputMaybe<Array<PostWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<PostCreateOrConnectWithoutLikesInput>>;
  create?: InputMaybe<Array<PostCreateWithoutLikesInput>>;
};

export type PostCreateNestedManyWithoutTagsInput = {
  connect?: InputMaybe<Array<PostWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<PostCreateOrConnectWithoutTagsInput>>;
  create?: InputMaybe<Array<PostCreateWithoutTagsInput>>;
};

export type PostCreateNestedOneWithoutCommentsInput = {
  connect?: InputMaybe<PostWhereUniqueInput>;
  connectOrCreate?: InputMaybe<PostCreateOrConnectWithoutCommentsInput>;
  create?: InputMaybe<PostCreateWithoutCommentsInput>;
};

export type PostCreateOrConnectWithoutAuthorInput = {
  create: PostCreateWithoutAuthorInput;
  where: PostWhereUniqueInput;
};

export type PostCreateOrConnectWithoutCommentsInput = {
  create: PostCreateWithoutCommentsInput;
  where: PostWhereUniqueInput;
};

export type PostCreateOrConnectWithoutLikesInput = {
  create: PostCreateWithoutLikesInput;
  where: PostWhereUniqueInput;
};

export type PostCreateOrConnectWithoutTagsInput = {
  create: PostCreateWithoutTagsInput;
  where: PostWhereUniqueInput;
};

export type PostCreateWithoutAuthorInput = {
  comments?: InputMaybe<CommentCreateNestedManyWithoutPortInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  likes?: InputMaybe<UserCreateNestedManyWithoutLikePostsInput>;
  message?: InputMaybe<Scalars['String']['input']>;
  tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  tags?: InputMaybe<TagCreateNestedManyWithoutPostsInput>;
  title: Scalars['String']['input'];
};

export type PostCreateWithoutCommentsInput = {
  author: UserCreateNestedOneWithoutPostsInput;
  id?: InputMaybe<Scalars['String']['input']>;
  likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  likes?: InputMaybe<UserCreateNestedManyWithoutLikePostsInput>;
  message?: InputMaybe<Scalars['String']['input']>;
  tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  tags?: InputMaybe<TagCreateNestedManyWithoutPostsInput>;
  title: Scalars['String']['input'];
};

export type PostCreateWithoutLikesInput = {
  author: UserCreateNestedOneWithoutPostsInput;
  comments?: InputMaybe<CommentCreateNestedManyWithoutPortInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  message?: InputMaybe<Scalars['String']['input']>;
  tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  tags?: InputMaybe<TagCreateNestedManyWithoutPostsInput>;
  title: Scalars['String']['input'];
};

export type PostCreateWithoutTagsInput = {
  author: UserCreateNestedOneWithoutPostsInput;
  comments?: InputMaybe<CommentCreateNestedManyWithoutPortInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  likes?: InputMaybe<UserCreateNestedManyWithoutLikePostsInput>;
  message?: InputMaybe<Scalars['String']['input']>;
  tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  title: Scalars['String']['input'];
};

export type PostCreatelikeIDsInput = {
  set: Array<Scalars['String']['input']>;
};

export type PostCreatetagIDsInput = {
  set: Array<Scalars['String']['input']>;
};

export type PostGroupBy = {
  __typename?: 'PostGroupBy';
  _count?: Maybe<PostCountAggregate>;
  _max?: Maybe<PostMaxAggregate>;
  _min?: Maybe<PostMinAggregate>;
  authorId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  likeIDs?: Maybe<Array<Scalars['String']['output']>>;
  message?: Maybe<Scalars['String']['output']>;
  tagIDs?: Maybe<Array<Scalars['String']['output']>>;
  title: Scalars['String']['output'];
};

export type PostListRelationFilter = {
  every?: InputMaybe<PostWhereInput>;
  none?: InputMaybe<PostWhereInput>;
  some?: InputMaybe<PostWhereInput>;
};

export type PostMaxAggregate = {
  __typename?: 'PostMaxAggregate';
  authorId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};

export type PostMaxOrderByAggregateInput = {
  authorId?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  message?: InputMaybe<SortOrder>;
  title?: InputMaybe<SortOrder>;
};

export type PostMinAggregate = {
  __typename?: 'PostMinAggregate';
  authorId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};

export type PostMinOrderByAggregateInput = {
  authorId?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  message?: InputMaybe<SortOrder>;
  title?: InputMaybe<SortOrder>;
};

export type PostOrderByRelationAggregateInput = {
  _count?: InputMaybe<SortOrder>;
};

export type PostOrderByWithAggregationInput = {
  _count?: InputMaybe<PostCountOrderByAggregateInput>;
  _max?: InputMaybe<PostMaxOrderByAggregateInput>;
  _min?: InputMaybe<PostMinOrderByAggregateInput>;
  authorId?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  likeIDs?: InputMaybe<SortOrder>;
  message?: InputMaybe<SortOrder>;
  tagIDs?: InputMaybe<SortOrder>;
  title?: InputMaybe<SortOrder>;
};

export type PostOrderByWithRelationInput = {
  author?: InputMaybe<UserOrderByWithRelationInput>;
  authorId?: InputMaybe<SortOrder>;
  comments?: InputMaybe<CommentOrderByRelationAggregateInput>;
  id?: InputMaybe<SortOrder>;
  likeIDs?: InputMaybe<SortOrder>;
  likes?: InputMaybe<UserOrderByRelationAggregateInput>;
  message?: InputMaybe<SortOrder>;
  tagIDs?: InputMaybe<SortOrder>;
  tags?: InputMaybe<TagOrderByRelationAggregateInput>;
  title?: InputMaybe<SortOrder>;
};

export type PostRelationFilter = {
  is?: InputMaybe<PostWhereInput>;
  isNot?: InputMaybe<PostWhereInput>;
};

export enum PostScalarFieldEnum {
  AuthorId = 'authorId',
  Id = 'id',
  LikeIDs = 'likeIDs',
  Message = 'message',
  TagIDs = 'tagIDs',
  Title = 'title'
}

export type PostScalarWhereInput = {
  AND?: InputMaybe<Array<PostScalarWhereInput>>;
  NOT?: InputMaybe<Array<PostScalarWhereInput>>;
  OR?: InputMaybe<Array<PostScalarWhereInput>>;
  authorId?: InputMaybe<StringFilter>;
  id?: InputMaybe<StringFilter>;
  likeIDs?: InputMaybe<StringNullableListFilter>;
  message?: InputMaybe<StringNullableFilter>;
  tagIDs?: InputMaybe<StringNullableListFilter>;
  title?: InputMaybe<StringFilter>;
};

export type PostScalarWhereWithAggregatesInput = {
  AND?: InputMaybe<Array<PostScalarWhereWithAggregatesInput>>;
  NOT?: InputMaybe<Array<PostScalarWhereWithAggregatesInput>>;
  OR?: InputMaybe<Array<PostScalarWhereWithAggregatesInput>>;
  authorId?: InputMaybe<StringWithAggregatesFilter>;
  id?: InputMaybe<StringWithAggregatesFilter>;
  likeIDs?: InputMaybe<StringNullableListFilter>;
  message?: InputMaybe<StringNullableWithAggregatesFilter>;
  tagIDs?: InputMaybe<StringNullableListFilter>;
  title?: InputMaybe<StringWithAggregatesFilter>;
};

export type PostUpdateInput = {
  author?: InputMaybe<UserUpdateOneRequiredWithoutPostsNestedInput>;
  comments?: InputMaybe<CommentUpdateManyWithoutPortNestedInput>;
  likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  likes?: InputMaybe<UserUpdateManyWithoutLikePostsNestedInput>;
  message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  tags?: InputMaybe<TagUpdateManyWithoutPostsNestedInput>;
  title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateManyMutationInput = {
  likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateManyWithWhereWithoutAuthorInput = {
  data: PostUpdateManyMutationInput;
  where: PostScalarWhereInput;
};

export type PostUpdateManyWithWhereWithoutLikesInput = {
  data: PostUpdateManyMutationInput;
  where: PostScalarWhereInput;
};

export type PostUpdateManyWithWhereWithoutTagsInput = {
  data: PostUpdateManyMutationInput;
  where: PostScalarWhereInput;
};

export type PostUpdateManyWithoutAuthorNestedInput = {
  connect?: InputMaybe<Array<PostWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<PostCreateOrConnectWithoutAuthorInput>>;
  create?: InputMaybe<Array<PostCreateWithoutAuthorInput>>;
  createMany?: InputMaybe<PostCreateManyAuthorInputEnvelope>;
  delete?: InputMaybe<Array<PostWhereUniqueInput>>;
  deleteMany?: InputMaybe<Array<PostScalarWhereInput>>;
  disconnect?: InputMaybe<Array<PostWhereUniqueInput>>;
  set?: InputMaybe<Array<PostWhereUniqueInput>>;
  update?: InputMaybe<Array<PostUpdateWithWhereUniqueWithoutAuthorInput>>;
  updateMany?: InputMaybe<Array<PostUpdateManyWithWhereWithoutAuthorInput>>;
  upsert?: InputMaybe<Array<PostUpsertWithWhereUniqueWithoutAuthorInput>>;
};

export type PostUpdateManyWithoutLikesNestedInput = {
  connect?: InputMaybe<Array<PostWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<PostCreateOrConnectWithoutLikesInput>>;
  create?: InputMaybe<Array<PostCreateWithoutLikesInput>>;
  delete?: InputMaybe<Array<PostWhereUniqueInput>>;
  deleteMany?: InputMaybe<Array<PostScalarWhereInput>>;
  disconnect?: InputMaybe<Array<PostWhereUniqueInput>>;
  set?: InputMaybe<Array<PostWhereUniqueInput>>;
  update?: InputMaybe<Array<PostUpdateWithWhereUniqueWithoutLikesInput>>;
  updateMany?: InputMaybe<Array<PostUpdateManyWithWhereWithoutLikesInput>>;
  upsert?: InputMaybe<Array<PostUpsertWithWhereUniqueWithoutLikesInput>>;
};

export type PostUpdateManyWithoutTagsNestedInput = {
  connect?: InputMaybe<Array<PostWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<PostCreateOrConnectWithoutTagsInput>>;
  create?: InputMaybe<Array<PostCreateWithoutTagsInput>>;
  delete?: InputMaybe<Array<PostWhereUniqueInput>>;
  deleteMany?: InputMaybe<Array<PostScalarWhereInput>>;
  disconnect?: InputMaybe<Array<PostWhereUniqueInput>>;
  set?: InputMaybe<Array<PostWhereUniqueInput>>;
  update?: InputMaybe<Array<PostUpdateWithWhereUniqueWithoutTagsInput>>;
  updateMany?: InputMaybe<Array<PostUpdateManyWithWhereWithoutTagsInput>>;
  upsert?: InputMaybe<Array<PostUpsertWithWhereUniqueWithoutTagsInput>>;
};

export type PostUpdateOneRequiredWithoutCommentsNestedInput = {
  connect?: InputMaybe<PostWhereUniqueInput>;
  connectOrCreate?: InputMaybe<PostCreateOrConnectWithoutCommentsInput>;
  create?: InputMaybe<PostCreateWithoutCommentsInput>;
  update?: InputMaybe<PostUpdateWithoutCommentsInput>;
  upsert?: InputMaybe<PostUpsertWithoutCommentsInput>;
};

export type PostUpdateWithWhereUniqueWithoutAuthorInput = {
  data: PostUpdateWithoutAuthorInput;
  where: PostWhereUniqueInput;
};

export type PostUpdateWithWhereUniqueWithoutLikesInput = {
  data: PostUpdateWithoutLikesInput;
  where: PostWhereUniqueInput;
};

export type PostUpdateWithWhereUniqueWithoutTagsInput = {
  data: PostUpdateWithoutTagsInput;
  where: PostWhereUniqueInput;
};

export type PostUpdateWithoutAuthorInput = {
  comments?: InputMaybe<CommentUpdateManyWithoutPortNestedInput>;
  likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  likes?: InputMaybe<UserUpdateManyWithoutLikePostsNestedInput>;
  message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  tags?: InputMaybe<TagUpdateManyWithoutPostsNestedInput>;
  title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateWithoutCommentsInput = {
  author?: InputMaybe<UserUpdateOneRequiredWithoutPostsNestedInput>;
  likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  likes?: InputMaybe<UserUpdateManyWithoutLikePostsNestedInput>;
  message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  tags?: InputMaybe<TagUpdateManyWithoutPostsNestedInput>;
  title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateWithoutLikesInput = {
  author?: InputMaybe<UserUpdateOneRequiredWithoutPostsNestedInput>;
  comments?: InputMaybe<CommentUpdateManyWithoutPortNestedInput>;
  likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  tags?: InputMaybe<TagUpdateManyWithoutPostsNestedInput>;
  title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateWithoutTagsInput = {
  author?: InputMaybe<UserUpdateOneRequiredWithoutPostsNestedInput>;
  comments?: InputMaybe<CommentUpdateManyWithoutPortNestedInput>;
  likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  likes?: InputMaybe<UserUpdateManyWithoutLikePostsNestedInput>;
  message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdatelikeIDsInput = {
  push?: InputMaybe<Array<Scalars['String']['input']>>;
  set?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type PostUpdatetagIDsInput = {
  push?: InputMaybe<Array<Scalars['String']['input']>>;
  set?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type PostUpsertWithWhereUniqueWithoutAuthorInput = {
  create: PostCreateWithoutAuthorInput;
  update: PostUpdateWithoutAuthorInput;
  where: PostWhereUniqueInput;
};

export type PostUpsertWithWhereUniqueWithoutLikesInput = {
  create: PostCreateWithoutLikesInput;
  update: PostUpdateWithoutLikesInput;
  where: PostWhereUniqueInput;
};

export type PostUpsertWithWhereUniqueWithoutTagsInput = {
  create: PostCreateWithoutTagsInput;
  update: PostUpdateWithoutTagsInput;
  where: PostWhereUniqueInput;
};

export type PostUpsertWithoutCommentsInput = {
  create: PostCreateWithoutCommentsInput;
  update: PostUpdateWithoutCommentsInput;
};

export type PostWhereInput = {
  AND?: InputMaybe<Array<PostWhereInput>>;
  NOT?: InputMaybe<Array<PostWhereInput>>;
  OR?: InputMaybe<Array<PostWhereInput>>;
  author?: InputMaybe<UserRelationFilter>;
  authorId?: InputMaybe<StringFilter>;
  comments?: InputMaybe<CommentListRelationFilter>;
  id?: InputMaybe<StringFilter>;
  likeIDs?: InputMaybe<StringNullableListFilter>;
  likes?: InputMaybe<UserListRelationFilter>;
  message?: InputMaybe<StringNullableFilter>;
  tagIDs?: InputMaybe<StringNullableListFilter>;
  tags?: InputMaybe<TagListRelationFilter>;
  title?: InputMaybe<StringFilter>;
};

export type PostWhereUniqueInput = {
  id?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  aggregateComment: AggregateComment;
  aggregatePost: AggregatePost;
  aggregateTag: AggregateTag;
  aggregateUser: AggregateUser;
  comment?: Maybe<Comment>;
  comments: Array<Comment>;
  findFirstComment?: Maybe<Comment>;
  findFirstCommentOrThrow?: Maybe<Comment>;
  findFirstPost?: Maybe<Post>;
  findFirstPostOrThrow?: Maybe<Post>;
  findFirstTag?: Maybe<Tag>;
  findFirstTagOrThrow?: Maybe<Tag>;
  findFirstUser?: Maybe<User>;
  findFirstUserOrThrow?: Maybe<User>;
  getComment?: Maybe<Comment>;
  getPost?: Maybe<Post>;
  getTag?: Maybe<Tag>;
  getUser?: Maybe<User>;
  groupByComment: Array<CommentGroupBy>;
  groupByPost: Array<PostGroupBy>;
  groupByTag: Array<TagGroupBy>;
  groupByUser: Array<UserGroupBy>;
  post?: Maybe<Post>;
  posts: Array<Post>;
  tag?: Maybe<Tag>;
  tags: Array<Tag>;
  test: Test;
  user?: Maybe<User>;
  users: Array<User>;
};


export type QueryAggregateCommentArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  orderBy?: InputMaybe<Array<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type QueryAggregatePostArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  orderBy?: InputMaybe<Array<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QueryAggregateTagArgs = {
  cursor?: InputMaybe<TagWhereUniqueInput>;
  orderBy?: InputMaybe<Array<TagOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<TagWhereInput>;
};


export type QueryAggregateUserArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  orderBy?: InputMaybe<Array<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};


export type QueryCommentArgs = {
  where: CommentWhereUniqueInput;
};


export type QueryCommentsArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<Array<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type QueryFindFirstCommentArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<Array<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type QueryFindFirstCommentOrThrowArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<Array<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type QueryFindFirstPostArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<Array<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QueryFindFirstPostOrThrowArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<Array<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QueryFindFirstTagArgs = {
  cursor?: InputMaybe<TagWhereUniqueInput>;
  distinct?: InputMaybe<Array<TagScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<TagOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<TagWhereInput>;
};


export type QueryFindFirstTagOrThrowArgs = {
  cursor?: InputMaybe<TagWhereUniqueInput>;
  distinct?: InputMaybe<Array<TagScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<TagOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<TagWhereInput>;
};


export type QueryFindFirstUserArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<Array<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};


export type QueryFindFirstUserOrThrowArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<Array<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};


export type QueryGetCommentArgs = {
  where: CommentWhereUniqueInput;
};


export type QueryGetPostArgs = {
  where: PostWhereUniqueInput;
};


export type QueryGetTagArgs = {
  where: TagWhereUniqueInput;
};


export type QueryGetUserArgs = {
  where: UserWhereUniqueInput;
};


export type QueryGroupByCommentArgs = {
  by: Array<CommentScalarFieldEnum>;
  having?: InputMaybe<CommentScalarWhereWithAggregatesInput>;
  orderBy?: InputMaybe<Array<CommentOrderByWithAggregationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type QueryGroupByPostArgs = {
  by: Array<PostScalarFieldEnum>;
  having?: InputMaybe<PostScalarWhereWithAggregatesInput>;
  orderBy?: InputMaybe<Array<PostOrderByWithAggregationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QueryGroupByTagArgs = {
  by: Array<TagScalarFieldEnum>;
  having?: InputMaybe<TagScalarWhereWithAggregatesInput>;
  orderBy?: InputMaybe<Array<TagOrderByWithAggregationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<TagWhereInput>;
};


export type QueryGroupByUserArgs = {
  by: Array<UserScalarFieldEnum>;
  having?: InputMaybe<UserScalarWhereWithAggregatesInput>;
  orderBy?: InputMaybe<Array<UserOrderByWithAggregationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};


export type QueryPostArgs = {
  where: PostWhereUniqueInput;
};


export type QueryPostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<Array<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QueryTagArgs = {
  where: TagWhereUniqueInput;
};


export type QueryTagsArgs = {
  cursor?: InputMaybe<TagWhereUniqueInput>;
  distinct?: InputMaybe<Array<TagScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<TagOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<TagWhereInput>;
};


export type QueryUserArgs = {
  where: UserWhereUniqueInput;
};


export type QueryUsersArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<Array<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};

export enum QueryMode {
  Default = 'default',
  Insensitive = 'insensitive'
}

export type SignInInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SignUpInput = {
  email: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
};

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc'
}

export type StringFieldUpdateOperationsInput = {
  set?: InputMaybe<Scalars['String']['input']>;
};

export type StringFilter = {
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  equals?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<QueryMode>;
  not?: InputMaybe<NestedStringFilter>;
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type StringNullableFilter = {
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  equals?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isSet?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<QueryMode>;
  not?: InputMaybe<NestedStringNullableFilter>;
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type StringNullableListFilter = {
  equals?: InputMaybe<Array<Scalars['String']['input']>>;
  has?: InputMaybe<Scalars['String']['input']>;
  hasEvery?: InputMaybe<Array<Scalars['String']['input']>>;
  hasSome?: InputMaybe<Array<Scalars['String']['input']>>;
  isEmpty?: InputMaybe<Scalars['Boolean']['input']>;
};

export type StringNullableWithAggregatesFilter = {
  _count?: InputMaybe<NestedIntNullableFilter>;
  _max?: InputMaybe<NestedStringNullableFilter>;
  _min?: InputMaybe<NestedStringNullableFilter>;
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  equals?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isSet?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<QueryMode>;
  not?: InputMaybe<NestedStringNullableWithAggregatesFilter>;
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type StringWithAggregatesFilter = {
  _count?: InputMaybe<NestedIntFilter>;
  _max?: InputMaybe<NestedStringFilter>;
  _min?: InputMaybe<NestedStringFilter>;
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  equals?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<QueryMode>;
  not?: InputMaybe<NestedStringWithAggregatesFilter>;
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type Tag = {
  __typename?: 'Tag';
  _count?: Maybe<TagCount>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  postIDs: Array<Scalars['String']['output']>;
  posts: Array<Post>;
};


export type TagPostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<Array<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};

export type TagCount = {
  __typename?: 'TagCount';
  posts: Scalars['Int']['output'];
};

export type TagCountAggregate = {
  __typename?: 'TagCountAggregate';
  _all: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  name: Scalars['Int']['output'];
  postIDs: Scalars['Int']['output'];
};

export type TagCountOrderByAggregateInput = {
  id?: InputMaybe<SortOrder>;
  name?: InputMaybe<SortOrder>;
  postIDs?: InputMaybe<SortOrder>;
};

export type TagCreateInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  postIDs?: InputMaybe<TagCreatepostIDsInput>;
  posts?: InputMaybe<PostCreateNestedManyWithoutTagsInput>;
};

export type TagCreateManyInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  postIDs?: InputMaybe<TagCreatepostIDsInput>;
};

export type TagCreateNestedManyWithoutPostsInput = {
  connect?: InputMaybe<Array<TagWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<TagCreateOrConnectWithoutPostsInput>>;
  create?: InputMaybe<Array<TagCreateWithoutPostsInput>>;
};

export type TagCreateOrConnectWithoutPostsInput = {
  create: TagCreateWithoutPostsInput;
  where: TagWhereUniqueInput;
};

export type TagCreateWithoutPostsInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  postIDs?: InputMaybe<TagCreatepostIDsInput>;
};

export type TagCreatepostIDsInput = {
  set: Array<Scalars['String']['input']>;
};

export type TagGroupBy = {
  __typename?: 'TagGroupBy';
  _count?: Maybe<TagCountAggregate>;
  _max?: Maybe<TagMaxAggregate>;
  _min?: Maybe<TagMinAggregate>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  postIDs?: Maybe<Array<Scalars['String']['output']>>;
};

export type TagListRelationFilter = {
  every?: InputMaybe<TagWhereInput>;
  none?: InputMaybe<TagWhereInput>;
  some?: InputMaybe<TagWhereInput>;
};

export type TagMaxAggregate = {
  __typename?: 'TagMaxAggregate';
  id?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type TagMaxOrderByAggregateInput = {
  id?: InputMaybe<SortOrder>;
  name?: InputMaybe<SortOrder>;
};

export type TagMinAggregate = {
  __typename?: 'TagMinAggregate';
  id?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type TagMinOrderByAggregateInput = {
  id?: InputMaybe<SortOrder>;
  name?: InputMaybe<SortOrder>;
};

export type TagOrderByRelationAggregateInput = {
  _count?: InputMaybe<SortOrder>;
};

export type TagOrderByWithAggregationInput = {
  _count?: InputMaybe<TagCountOrderByAggregateInput>;
  _max?: InputMaybe<TagMaxOrderByAggregateInput>;
  _min?: InputMaybe<TagMinOrderByAggregateInput>;
  id?: InputMaybe<SortOrder>;
  name?: InputMaybe<SortOrder>;
  postIDs?: InputMaybe<SortOrder>;
};

export type TagOrderByWithRelationInput = {
  id?: InputMaybe<SortOrder>;
  name?: InputMaybe<SortOrder>;
  postIDs?: InputMaybe<SortOrder>;
  posts?: InputMaybe<PostOrderByRelationAggregateInput>;
};

export enum TagScalarFieldEnum {
  Id = 'id',
  Name = 'name',
  PostIDs = 'postIDs'
}

export type TagScalarWhereInput = {
  AND?: InputMaybe<Array<TagScalarWhereInput>>;
  NOT?: InputMaybe<Array<TagScalarWhereInput>>;
  OR?: InputMaybe<Array<TagScalarWhereInput>>;
  id?: InputMaybe<StringFilter>;
  name?: InputMaybe<StringFilter>;
  postIDs?: InputMaybe<StringNullableListFilter>;
};

export type TagScalarWhereWithAggregatesInput = {
  AND?: InputMaybe<Array<TagScalarWhereWithAggregatesInput>>;
  NOT?: InputMaybe<Array<TagScalarWhereWithAggregatesInput>>;
  OR?: InputMaybe<Array<TagScalarWhereWithAggregatesInput>>;
  id?: InputMaybe<StringWithAggregatesFilter>;
  name?: InputMaybe<StringWithAggregatesFilter>;
  postIDs?: InputMaybe<StringNullableListFilter>;
};

export type TagUpdateInput = {
  name?: InputMaybe<StringFieldUpdateOperationsInput>;
  postIDs?: InputMaybe<TagUpdatepostIDsInput>;
  posts?: InputMaybe<PostUpdateManyWithoutTagsNestedInput>;
};

export type TagUpdateManyMutationInput = {
  name?: InputMaybe<StringFieldUpdateOperationsInput>;
  postIDs?: InputMaybe<TagUpdatepostIDsInput>;
};

export type TagUpdateManyWithWhereWithoutPostsInput = {
  data: TagUpdateManyMutationInput;
  where: TagScalarWhereInput;
};

export type TagUpdateManyWithoutPostsNestedInput = {
  connect?: InputMaybe<Array<TagWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<TagCreateOrConnectWithoutPostsInput>>;
  create?: InputMaybe<Array<TagCreateWithoutPostsInput>>;
  delete?: InputMaybe<Array<TagWhereUniqueInput>>;
  deleteMany?: InputMaybe<Array<TagScalarWhereInput>>;
  disconnect?: InputMaybe<Array<TagWhereUniqueInput>>;
  set?: InputMaybe<Array<TagWhereUniqueInput>>;
  update?: InputMaybe<Array<TagUpdateWithWhereUniqueWithoutPostsInput>>;
  updateMany?: InputMaybe<Array<TagUpdateManyWithWhereWithoutPostsInput>>;
  upsert?: InputMaybe<Array<TagUpsertWithWhereUniqueWithoutPostsInput>>;
};

export type TagUpdateWithWhereUniqueWithoutPostsInput = {
  data: TagUpdateWithoutPostsInput;
  where: TagWhereUniqueInput;
};

export type TagUpdateWithoutPostsInput = {
  name?: InputMaybe<StringFieldUpdateOperationsInput>;
  postIDs?: InputMaybe<TagUpdatepostIDsInput>;
};

export type TagUpdatepostIDsInput = {
  push?: InputMaybe<Array<Scalars['String']['input']>>;
  set?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type TagUpsertWithWhereUniqueWithoutPostsInput = {
  create: TagCreateWithoutPostsInput;
  update: TagUpdateWithoutPostsInput;
  where: TagWhereUniqueInput;
};

export type TagWhereInput = {
  AND?: InputMaybe<Array<TagWhereInput>>;
  NOT?: InputMaybe<Array<TagWhereInput>>;
  OR?: InputMaybe<Array<TagWhereInput>>;
  id?: InputMaybe<StringFilter>;
  name?: InputMaybe<StringFilter>;
  postIDs?: InputMaybe<StringNullableListFilter>;
  posts?: InputMaybe<PostListRelationFilter>;
};

export type TagWhereUniqueInput = {
  id?: InputMaybe<Scalars['String']['input']>;
};

export type Test = {
  __typename?: 'Test';
  /** Database id */
  id: Scalars['ID']['output'];
  /** User's real world name */
  name: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  _count?: Maybe<UserCount>;
  comments: Array<Comment>;
  email: Scalars['String']['output'];
  followerIDs: Array<Scalars['String']['output']>;
  followers: Array<User>;
  following: Array<User>;
  followingIDs: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  likePostIDs: Array<Scalars['String']['output']>;
  likePosts: Array<Post>;
  name?: Maybe<Scalars['String']['output']>;
  posts: Array<Post>;
};


export type UserCommentsArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<Array<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type UserFollowersArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<Array<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};


export type UserFollowingArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<Array<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserWhereInput>;
};


export type UserLikePostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<Array<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};


export type UserPostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<Array<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<Array<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};

export type UserCount = {
  __typename?: 'UserCount';
  comments: Scalars['Int']['output'];
  followers: Scalars['Int']['output'];
  following: Scalars['Int']['output'];
  likePosts: Scalars['Int']['output'];
  posts: Scalars['Int']['output'];
};

export type UserCountAggregate = {
  __typename?: 'UserCountAggregate';
  _all: Scalars['Int']['output'];
  email: Scalars['Int']['output'];
  followerIDs: Scalars['Int']['output'];
  followingIDs: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  likePostIDs: Scalars['Int']['output'];
  name: Scalars['Int']['output'];
  password: Scalars['Int']['output'];
  roles: Scalars['Int']['output'];
};

export type UserCountOrderByAggregateInput = {
  email?: InputMaybe<SortOrder>;
  followerIDs?: InputMaybe<SortOrder>;
  followingIDs?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  likePostIDs?: InputMaybe<SortOrder>;
  name?: InputMaybe<SortOrder>;
  password?: InputMaybe<SortOrder>;
  roles?: InputMaybe<SortOrder>;
};

export type UserCreateInput = {
  comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  email: Scalars['String']['input'];
  followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateManyInput = {
  email: Scalars['String']['input'];
  followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateNestedManyWithoutFollowersInput = {
  connect?: InputMaybe<Array<UserWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<UserCreateOrConnectWithoutFollowersInput>>;
  create?: InputMaybe<Array<UserCreateWithoutFollowersInput>>;
};

export type UserCreateNestedManyWithoutFollowingInput = {
  connect?: InputMaybe<Array<UserWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<UserCreateOrConnectWithoutFollowingInput>>;
  create?: InputMaybe<Array<UserCreateWithoutFollowingInput>>;
};

export type UserCreateNestedManyWithoutLikePostsInput = {
  connect?: InputMaybe<Array<UserWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<UserCreateOrConnectWithoutLikePostsInput>>;
  create?: InputMaybe<Array<UserCreateWithoutLikePostsInput>>;
};

export type UserCreateNestedOneWithoutCommentsInput = {
  connect?: InputMaybe<UserWhereUniqueInput>;
  connectOrCreate?: InputMaybe<UserCreateOrConnectWithoutCommentsInput>;
  create?: InputMaybe<UserCreateWithoutCommentsInput>;
};

export type UserCreateNestedOneWithoutPostsInput = {
  connect?: InputMaybe<UserWhereUniqueInput>;
  connectOrCreate?: InputMaybe<UserCreateOrConnectWithoutPostsInput>;
  create?: InputMaybe<UserCreateWithoutPostsInput>;
};

export type UserCreateOrConnectWithoutCommentsInput = {
  create: UserCreateWithoutCommentsInput;
  where: UserWhereUniqueInput;
};

export type UserCreateOrConnectWithoutFollowersInput = {
  create: UserCreateWithoutFollowersInput;
  where: UserWhereUniqueInput;
};

export type UserCreateOrConnectWithoutFollowingInput = {
  create: UserCreateWithoutFollowingInput;
  where: UserWhereUniqueInput;
};

export type UserCreateOrConnectWithoutLikePostsInput = {
  create: UserCreateWithoutLikePostsInput;
  where: UserWhereUniqueInput;
};

export type UserCreateOrConnectWithoutPostsInput = {
  create: UserCreateWithoutPostsInput;
  where: UserWhereUniqueInput;
};

export type UserCreateWithoutCommentsInput = {
  email: Scalars['String']['input'];
  followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateWithoutFollowersInput = {
  comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  email: Scalars['String']['input'];
  followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateWithoutFollowingInput = {
  comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  email: Scalars['String']['input'];
  followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateWithoutLikePostsInput = {
  comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  email: Scalars['String']['input'];
  followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateWithoutPostsInput = {
  comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  email: Scalars['String']['input'];
  followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreatefollowerIDsInput = {
  set: Array<Scalars['String']['input']>;
};

export type UserCreatefollowingIDsInput = {
  set: Array<Scalars['String']['input']>;
};

export type UserCreatelikePostIDsInput = {
  set: Array<Scalars['String']['input']>;
};

export type UserCreaterolesInput = {
  set: Array<Scalars['String']['input']>;
};

export type UserGroupBy = {
  __typename?: 'UserGroupBy';
  _count?: Maybe<UserCountAggregate>;
  _max?: Maybe<UserMaxAggregate>;
  _min?: Maybe<UserMinAggregate>;
  email: Scalars['String']['output'];
  followerIDs?: Maybe<Array<Scalars['String']['output']>>;
  followingIDs?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['String']['output'];
  likePostIDs?: Maybe<Array<Scalars['String']['output']>>;
  name?: Maybe<Scalars['String']['output']>;
  password?: Maybe<Scalars['String']['output']>;
  roles?: Maybe<Array<Scalars['String']['output']>>;
};

export type UserListRelationFilter = {
  every?: InputMaybe<UserWhereInput>;
  none?: InputMaybe<UserWhereInput>;
  some?: InputMaybe<UserWhereInput>;
};

export type UserMaxAggregate = {
  __typename?: 'UserMaxAggregate';
  email?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  password?: Maybe<Scalars['String']['output']>;
};

export type UserMaxOrderByAggregateInput = {
  email?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  name?: InputMaybe<SortOrder>;
  password?: InputMaybe<SortOrder>;
};

export type UserMinAggregate = {
  __typename?: 'UserMinAggregate';
  email?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  password?: Maybe<Scalars['String']['output']>;
};

export type UserMinOrderByAggregateInput = {
  email?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  name?: InputMaybe<SortOrder>;
  password?: InputMaybe<SortOrder>;
};

export type UserOrderByRelationAggregateInput = {
  _count?: InputMaybe<SortOrder>;
};

export type UserOrderByWithAggregationInput = {
  _count?: InputMaybe<UserCountOrderByAggregateInput>;
  _max?: InputMaybe<UserMaxOrderByAggregateInput>;
  _min?: InputMaybe<UserMinOrderByAggregateInput>;
  email?: InputMaybe<SortOrder>;
  followerIDs?: InputMaybe<SortOrder>;
  followingIDs?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  likePostIDs?: InputMaybe<SortOrder>;
  name?: InputMaybe<SortOrder>;
  password?: InputMaybe<SortOrder>;
  roles?: InputMaybe<SortOrder>;
};

export type UserOrderByWithRelationInput = {
  comments?: InputMaybe<CommentOrderByRelationAggregateInput>;
  email?: InputMaybe<SortOrder>;
  followerIDs?: InputMaybe<SortOrder>;
  followers?: InputMaybe<UserOrderByRelationAggregateInput>;
  following?: InputMaybe<UserOrderByRelationAggregateInput>;
  followingIDs?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  likePostIDs?: InputMaybe<SortOrder>;
  likePosts?: InputMaybe<PostOrderByRelationAggregateInput>;
  name?: InputMaybe<SortOrder>;
  password?: InputMaybe<SortOrder>;
  posts?: InputMaybe<PostOrderByRelationAggregateInput>;
  roles?: InputMaybe<SortOrder>;
};

export type UserRelationFilter = {
  is?: InputMaybe<UserWhereInput>;
  isNot?: InputMaybe<UserWhereInput>;
};

export enum UserScalarFieldEnum {
  Email = 'email',
  FollowerIDs = 'followerIDs',
  FollowingIDs = 'followingIDs',
  Id = 'id',
  LikePostIDs = 'likePostIDs',
  Name = 'name',
  Password = 'password',
  Roles = 'roles'
}

export type UserScalarWhereInput = {
  AND?: InputMaybe<Array<UserScalarWhereInput>>;
  NOT?: InputMaybe<Array<UserScalarWhereInput>>;
  OR?: InputMaybe<Array<UserScalarWhereInput>>;
  email?: InputMaybe<StringFilter>;
  followerIDs?: InputMaybe<StringNullableListFilter>;
  followingIDs?: InputMaybe<StringNullableListFilter>;
  id?: InputMaybe<StringFilter>;
  likePostIDs?: InputMaybe<StringNullableListFilter>;
  name?: InputMaybe<StringNullableFilter>;
  password?: InputMaybe<StringNullableFilter>;
  roles?: InputMaybe<StringNullableListFilter>;
};

export type UserScalarWhereWithAggregatesInput = {
  AND?: InputMaybe<Array<UserScalarWhereWithAggregatesInput>>;
  NOT?: InputMaybe<Array<UserScalarWhereWithAggregatesInput>>;
  OR?: InputMaybe<Array<UserScalarWhereWithAggregatesInput>>;
  email?: InputMaybe<StringWithAggregatesFilter>;
  followerIDs?: InputMaybe<StringNullableListFilter>;
  followingIDs?: InputMaybe<StringNullableListFilter>;
  id?: InputMaybe<StringWithAggregatesFilter>;
  likePostIDs?: InputMaybe<StringNullableListFilter>;
  name?: InputMaybe<StringNullableWithAggregatesFilter>;
  password?: InputMaybe<StringNullableWithAggregatesFilter>;
  roles?: InputMaybe<StringNullableListFilter>;
};

export type UserUpdateInput = {
  comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  email?: InputMaybe<StringFieldUpdateOperationsInput>;
  followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateManyMutationInput = {
  email?: InputMaybe<StringFieldUpdateOperationsInput>;
  followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateManyWithWhereWithoutFollowersInput = {
  data: UserUpdateManyMutationInput;
  where: UserScalarWhereInput;
};

export type UserUpdateManyWithWhereWithoutFollowingInput = {
  data: UserUpdateManyMutationInput;
  where: UserScalarWhereInput;
};

export type UserUpdateManyWithWhereWithoutLikePostsInput = {
  data: UserUpdateManyMutationInput;
  where: UserScalarWhereInput;
};

export type UserUpdateManyWithoutFollowersNestedInput = {
  connect?: InputMaybe<Array<UserWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<UserCreateOrConnectWithoutFollowersInput>>;
  create?: InputMaybe<Array<UserCreateWithoutFollowersInput>>;
  delete?: InputMaybe<Array<UserWhereUniqueInput>>;
  deleteMany?: InputMaybe<Array<UserScalarWhereInput>>;
  disconnect?: InputMaybe<Array<UserWhereUniqueInput>>;
  set?: InputMaybe<Array<UserWhereUniqueInput>>;
  update?: InputMaybe<Array<UserUpdateWithWhereUniqueWithoutFollowersInput>>;
  updateMany?: InputMaybe<Array<UserUpdateManyWithWhereWithoutFollowersInput>>;
  upsert?: InputMaybe<Array<UserUpsertWithWhereUniqueWithoutFollowersInput>>;
};

export type UserUpdateManyWithoutFollowingNestedInput = {
  connect?: InputMaybe<Array<UserWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<UserCreateOrConnectWithoutFollowingInput>>;
  create?: InputMaybe<Array<UserCreateWithoutFollowingInput>>;
  delete?: InputMaybe<Array<UserWhereUniqueInput>>;
  deleteMany?: InputMaybe<Array<UserScalarWhereInput>>;
  disconnect?: InputMaybe<Array<UserWhereUniqueInput>>;
  set?: InputMaybe<Array<UserWhereUniqueInput>>;
  update?: InputMaybe<Array<UserUpdateWithWhereUniqueWithoutFollowingInput>>;
  updateMany?: InputMaybe<Array<UserUpdateManyWithWhereWithoutFollowingInput>>;
  upsert?: InputMaybe<Array<UserUpsertWithWhereUniqueWithoutFollowingInput>>;
};

export type UserUpdateManyWithoutLikePostsNestedInput = {
  connect?: InputMaybe<Array<UserWhereUniqueInput>>;
  connectOrCreate?: InputMaybe<Array<UserCreateOrConnectWithoutLikePostsInput>>;
  create?: InputMaybe<Array<UserCreateWithoutLikePostsInput>>;
  delete?: InputMaybe<Array<UserWhereUniqueInput>>;
  deleteMany?: InputMaybe<Array<UserScalarWhereInput>>;
  disconnect?: InputMaybe<Array<UserWhereUniqueInput>>;
  set?: InputMaybe<Array<UserWhereUniqueInput>>;
  update?: InputMaybe<Array<UserUpdateWithWhereUniqueWithoutLikePostsInput>>;
  updateMany?: InputMaybe<Array<UserUpdateManyWithWhereWithoutLikePostsInput>>;
  upsert?: InputMaybe<Array<UserUpsertWithWhereUniqueWithoutLikePostsInput>>;
};

export type UserUpdateOneRequiredWithoutCommentsNestedInput = {
  connect?: InputMaybe<UserWhereUniqueInput>;
  connectOrCreate?: InputMaybe<UserCreateOrConnectWithoutCommentsInput>;
  create?: InputMaybe<UserCreateWithoutCommentsInput>;
  update?: InputMaybe<UserUpdateWithoutCommentsInput>;
  upsert?: InputMaybe<UserUpsertWithoutCommentsInput>;
};

export type UserUpdateOneRequiredWithoutPostsNestedInput = {
  connect?: InputMaybe<UserWhereUniqueInput>;
  connectOrCreate?: InputMaybe<UserCreateOrConnectWithoutPostsInput>;
  create?: InputMaybe<UserCreateWithoutPostsInput>;
  update?: InputMaybe<UserUpdateWithoutPostsInput>;
  upsert?: InputMaybe<UserUpsertWithoutPostsInput>;
};

export type UserUpdateWithWhereUniqueWithoutFollowersInput = {
  data: UserUpdateWithoutFollowersInput;
  where: UserWhereUniqueInput;
};

export type UserUpdateWithWhereUniqueWithoutFollowingInput = {
  data: UserUpdateWithoutFollowingInput;
  where: UserWhereUniqueInput;
};

export type UserUpdateWithWhereUniqueWithoutLikePostsInput = {
  data: UserUpdateWithoutLikePostsInput;
  where: UserWhereUniqueInput;
};

export type UserUpdateWithoutCommentsInput = {
  email?: InputMaybe<StringFieldUpdateOperationsInput>;
  followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateWithoutFollowersInput = {
  comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  email?: InputMaybe<StringFieldUpdateOperationsInput>;
  followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateWithoutFollowingInput = {
  comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  email?: InputMaybe<StringFieldUpdateOperationsInput>;
  followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateWithoutLikePostsInput = {
  comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  email?: InputMaybe<StringFieldUpdateOperationsInput>;
  followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateWithoutPostsInput = {
  comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  email?: InputMaybe<StringFieldUpdateOperationsInput>;
  followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdatefollowerIDsInput = {
  push?: InputMaybe<Array<Scalars['String']['input']>>;
  set?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UserUpdatefollowingIDsInput = {
  push?: InputMaybe<Array<Scalars['String']['input']>>;
  set?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UserUpdatelikePostIDsInput = {
  push?: InputMaybe<Array<Scalars['String']['input']>>;
  set?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UserUpdaterolesInput = {
  push?: InputMaybe<Array<Scalars['String']['input']>>;
  set?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UserUpsertWithWhereUniqueWithoutFollowersInput = {
  create: UserCreateWithoutFollowersInput;
  update: UserUpdateWithoutFollowersInput;
  where: UserWhereUniqueInput;
};

export type UserUpsertWithWhereUniqueWithoutFollowingInput = {
  create: UserCreateWithoutFollowingInput;
  update: UserUpdateWithoutFollowingInput;
  where: UserWhereUniqueInput;
};

export type UserUpsertWithWhereUniqueWithoutLikePostsInput = {
  create: UserCreateWithoutLikePostsInput;
  update: UserUpdateWithoutLikePostsInput;
  where: UserWhereUniqueInput;
};

export type UserUpsertWithoutCommentsInput = {
  create: UserCreateWithoutCommentsInput;
  update: UserUpdateWithoutCommentsInput;
};

export type UserUpsertWithoutPostsInput = {
  create: UserCreateWithoutPostsInput;
  update: UserUpdateWithoutPostsInput;
};

export type UserWhereInput = {
  AND?: InputMaybe<Array<UserWhereInput>>;
  NOT?: InputMaybe<Array<UserWhereInput>>;
  OR?: InputMaybe<Array<UserWhereInput>>;
  comments?: InputMaybe<CommentListRelationFilter>;
  email?: InputMaybe<StringFilter>;
  followerIDs?: InputMaybe<StringNullableListFilter>;
  followers?: InputMaybe<UserListRelationFilter>;
  following?: InputMaybe<UserListRelationFilter>;
  followingIDs?: InputMaybe<StringNullableListFilter>;
  id?: InputMaybe<StringFilter>;
  likePostIDs?: InputMaybe<StringNullableListFilter>;
  likePosts?: InputMaybe<PostListRelationFilter>;
  name?: InputMaybe<StringNullableFilter>;
  password?: InputMaybe<StringNullableFilter>;
  posts?: InputMaybe<PostListRelationFilter>;
  roles?: InputMaybe<StringNullableListFilter>;
};

export type UserWhereUniqueInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
};

export type GetPostsQueryVariables = Exact<{
  coursor?: InputMaybe<PostWhereUniqueInput>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetPostsQuery = { __typename?: 'Query', posts: Array<{ __typename?: 'Post', id: string, title: string, _count?: { __typename?: 'PostCount', likes: number, comments: number } | null, tags: Array<{ __typename?: 'Tag', id: string, name: string }> }> };

export type GetUserQueryVariables = Exact<{
  where: UserWhereUniqueInput;
}>;


export type GetUserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, email: string, posts: Array<{ __typename?: 'Post', id: string, _count?: { __typename?: 'PostCount', likes: number } | null }> } | null };


export const GetPostsDocument = gql`
    query getPosts($coursor: PostWhereUniqueInput, $skip: Int, $take: Int) {
  posts(cursor: $coursor, skip: $skip, take: $take) {
    id
    _count {
      likes
      comments
    }
    tags {
      id
      name
    }
    title
  }
}
    `;

export function useGetPostsQuery(options: Omit<Urql.UseQueryArgs<never, GetPostsQueryVariables>, 'query'> = {}) {
  return Urql.useQuery<GetPostsQuery>({ query: GetPostsDocument, ...options });
};
export const GetUserDocument = gql`
    query getUser($where: UserWhereUniqueInput!) {
  user(where: $where) {
    id
    email
    posts {
      id
      _count {
        likes
      }
    }
  }
}
    `;

export function useGetUserQuery(options: Omit<Urql.UseQueryArgs<never, GetUserQueryVariables>, 'query'> = {}) {
  return Urql.useQuery<GetUserQuery>({ query: GetUserDocument, ...options });
};