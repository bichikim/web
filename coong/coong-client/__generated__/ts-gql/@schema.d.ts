// ts-gql-integrity:2ba016c88298d88d53b97c8b9cacad1d
/*
ts-gql-meta-begin
{
  "hash": "fc5b1c5d5f3df68562e4e7357bc14899"
}
ts-gql-meta-end
*/
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type AffectedRowsOutput = {
  readonly __typename: 'AffectedRowsOutput';
  readonly count: Scalars['Int'];
};

export type AggregateComment = {
  readonly __typename: 'AggregateComment';
  readonly _count: Maybe<CommentCountAggregate>;
  readonly _max: Maybe<CommentMaxAggregate>;
  readonly _min: Maybe<CommentMinAggregate>;
};

export type AggregatePost = {
  readonly __typename: 'AggregatePost';
  readonly _count: Maybe<PostCountAggregate>;
  readonly _max: Maybe<PostMaxAggregate>;
  readonly _min: Maybe<PostMinAggregate>;
};

export type AggregateTag = {
  readonly __typename: 'AggregateTag';
  readonly _count: Maybe<TagCountAggregate>;
  readonly _max: Maybe<TagMaxAggregate>;
  readonly _min: Maybe<TagMinAggregate>;
};

export type AggregateUser = {
  readonly __typename: 'AggregateUser';
  readonly _count: Maybe<UserCountAggregate>;
  readonly _max: Maybe<UserMaxAggregate>;
  readonly _min: Maybe<UserMinAggregate>;
};

/** user and auth token */
export type AuthUser = {
  readonly __typename: 'AuthUser';
  readonly _count: Maybe<UserCount>;
  readonly comments: ReadonlyArray<Comment>;
  readonly email: Scalars['String'];
  readonly followerIDs: ReadonlyArray<Scalars['String']>;
  readonly followers: ReadonlyArray<User>;
  readonly following: ReadonlyArray<User>;
  readonly followingIDs: ReadonlyArray<Scalars['String']>;
  readonly id: Scalars['String'];
  readonly likePostIDs: ReadonlyArray<Scalars['String']>;
  readonly likePosts: ReadonlyArray<Post>;
  readonly name: Maybe<Scalars['String']>;
  readonly posts: ReadonlyArray<Post>;
  /** jwt token */
  readonly token: Scalars['String'];
};


/** user and auth token */
export type AuthUsercommentsArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<CommentWhereInput>;
};


/** user and auth token */
export type AuthUserfollowersArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<UserWhereInput>;
};


/** user and auth token */
export type AuthUserfollowingArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<UserWhereInput>;
};


/** user and auth token */
export type AuthUserlikePostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<PostWhereInput>;
};


/** user and auth token */
export type AuthUserpostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<PostWhereInput>;
};

export type Comment = {
  readonly __typename: 'Comment';
  readonly author: User;
  readonly authorId: Scalars['String'];
  readonly id: Scalars['String'];
  readonly message: Scalars['String'];
  readonly port: Post;
  readonly postId: Scalars['String'];
};

export type CommentCountAggregate = {
  readonly __typename: 'CommentCountAggregate';
  readonly _all: Scalars['Int'];
  readonly authorId: Scalars['Int'];
  readonly id: Scalars['Int'];
  readonly message: Scalars['Int'];
  readonly postId: Scalars['Int'];
};

export type CommentCountOrderByAggregateInput = {
  readonly authorId?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly message?: InputMaybe<SortOrder>;
  readonly postId?: InputMaybe<SortOrder>;
};

export type CommentCreateInput = {
  readonly author: UserCreateNestedOneWithoutCommentsInput;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly message: Scalars['String'];
  readonly port: PostCreateNestedOneWithoutCommentsInput;
};

export type CommentCreateManyAuthorInput = {
  readonly id?: InputMaybe<Scalars['String']>;
  readonly message: Scalars['String'];
  readonly postId: Scalars['String'];
};

export type CommentCreateManyAuthorInputEnvelope = {
  readonly data: ReadonlyArray<CommentCreateManyAuthorInput>;
};

export type CommentCreateManyInput = {
  readonly authorId: Scalars['String'];
  readonly id?: InputMaybe<Scalars['String']>;
  readonly message: Scalars['String'];
  readonly postId: Scalars['String'];
};

export type CommentCreateManyPortInput = {
  readonly authorId: Scalars['String'];
  readonly id?: InputMaybe<Scalars['String']>;
  readonly message: Scalars['String'];
};

export type CommentCreateManyPortInputEnvelope = {
  readonly data: ReadonlyArray<CommentCreateManyPortInput>;
};

export type CommentCreateNestedManyWithoutAuthorInput = {
  readonly connect?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<CommentCreateOrConnectWithoutAuthorInput>>;
  readonly create?: InputMaybe<ReadonlyArray<CommentCreateWithoutAuthorInput>>;
  readonly createMany?: InputMaybe<CommentCreateManyAuthorInputEnvelope>;
};

export type CommentCreateNestedManyWithoutPortInput = {
  readonly connect?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<CommentCreateOrConnectWithoutPortInput>>;
  readonly create?: InputMaybe<ReadonlyArray<CommentCreateWithoutPortInput>>;
  readonly createMany?: InputMaybe<CommentCreateManyPortInputEnvelope>;
};

export type CommentCreateOrConnectWithoutAuthorInput = {
  readonly create: CommentCreateWithoutAuthorInput;
  readonly where: CommentWhereUniqueInput;
};

export type CommentCreateOrConnectWithoutPortInput = {
  readonly create: CommentCreateWithoutPortInput;
  readonly where: CommentWhereUniqueInput;
};

export type CommentCreateWithoutAuthorInput = {
  readonly id?: InputMaybe<Scalars['String']>;
  readonly message: Scalars['String'];
  readonly port: PostCreateNestedOneWithoutCommentsInput;
};

export type CommentCreateWithoutPortInput = {
  readonly author: UserCreateNestedOneWithoutCommentsInput;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly message: Scalars['String'];
};

export type CommentGroupBy = {
  readonly __typename: 'CommentGroupBy';
  readonly _count: Maybe<CommentCountAggregate>;
  readonly _max: Maybe<CommentMaxAggregate>;
  readonly _min: Maybe<CommentMinAggregate>;
  readonly authorId: Scalars['String'];
  readonly id: Scalars['String'];
  readonly message: Scalars['String'];
  readonly postId: Scalars['String'];
};

export type CommentListRelationFilter = {
  readonly every?: InputMaybe<CommentWhereInput>;
  readonly none?: InputMaybe<CommentWhereInput>;
  readonly some?: InputMaybe<CommentWhereInput>;
};

export type CommentMaxAggregate = {
  readonly __typename: 'CommentMaxAggregate';
  readonly authorId: Maybe<Scalars['String']>;
  readonly id: Maybe<Scalars['String']>;
  readonly message: Maybe<Scalars['String']>;
  readonly postId: Maybe<Scalars['String']>;
};

export type CommentMaxOrderByAggregateInput = {
  readonly authorId?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly message?: InputMaybe<SortOrder>;
  readonly postId?: InputMaybe<SortOrder>;
};

export type CommentMinAggregate = {
  readonly __typename: 'CommentMinAggregate';
  readonly authorId: Maybe<Scalars['String']>;
  readonly id: Maybe<Scalars['String']>;
  readonly message: Maybe<Scalars['String']>;
  readonly postId: Maybe<Scalars['String']>;
};

export type CommentMinOrderByAggregateInput = {
  readonly authorId?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly message?: InputMaybe<SortOrder>;
  readonly postId?: InputMaybe<SortOrder>;
};

export type CommentOrderByRelationAggregateInput = {
  readonly _count?: InputMaybe<SortOrder>;
};

export type CommentOrderByWithAggregationInput = {
  readonly _count?: InputMaybe<CommentCountOrderByAggregateInput>;
  readonly _max?: InputMaybe<CommentMaxOrderByAggregateInput>;
  readonly _min?: InputMaybe<CommentMinOrderByAggregateInput>;
  readonly authorId?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly message?: InputMaybe<SortOrder>;
  readonly postId?: InputMaybe<SortOrder>;
};

export type CommentOrderByWithRelationInput = {
  readonly author?: InputMaybe<UserOrderByWithRelationInput>;
  readonly authorId?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly message?: InputMaybe<SortOrder>;
  readonly port?: InputMaybe<PostOrderByWithRelationInput>;
  readonly postId?: InputMaybe<SortOrder>;
};

export type CommentScalarFieldEnum =
  | 'authorId'
  | 'id'
  | 'message'
  | 'postId';

export type CommentScalarWhereInput = {
  readonly AND?: InputMaybe<ReadonlyArray<CommentScalarWhereInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<CommentScalarWhereInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<CommentScalarWhereInput>>;
  readonly authorId?: InputMaybe<StringFilter>;
  readonly id?: InputMaybe<StringFilter>;
  readonly message?: InputMaybe<StringFilter>;
  readonly postId?: InputMaybe<StringFilter>;
};

export type CommentScalarWhereWithAggregatesInput = {
  readonly AND?: InputMaybe<ReadonlyArray<CommentScalarWhereWithAggregatesInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<CommentScalarWhereWithAggregatesInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<CommentScalarWhereWithAggregatesInput>>;
  readonly authorId?: InputMaybe<StringWithAggregatesFilter>;
  readonly id?: InputMaybe<StringWithAggregatesFilter>;
  readonly message?: InputMaybe<StringWithAggregatesFilter>;
  readonly postId?: InputMaybe<StringWithAggregatesFilter>;
};

export type CommentUpdateInput = {
  readonly author?: InputMaybe<UserUpdateOneRequiredWithoutCommentsNestedInput>;
  readonly message?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly port?: InputMaybe<PostUpdateOneRequiredWithoutCommentsNestedInput>;
};

export type CommentUpdateManyMutationInput = {
  readonly message?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type CommentUpdateManyWithWhereWithoutAuthorInput = {
  readonly data: CommentUpdateManyMutationInput;
  readonly where: CommentScalarWhereInput;
};

export type CommentUpdateManyWithWhereWithoutPortInput = {
  readonly data: CommentUpdateManyMutationInput;
  readonly where: CommentScalarWhereInput;
};

export type CommentUpdateManyWithoutAuthorNestedInput = {
  readonly connect?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<CommentCreateOrConnectWithoutAuthorInput>>;
  readonly create?: InputMaybe<ReadonlyArray<CommentCreateWithoutAuthorInput>>;
  readonly createMany?: InputMaybe<CommentCreateManyAuthorInputEnvelope>;
  readonly delete?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly deleteMany?: InputMaybe<ReadonlyArray<CommentScalarWhereInput>>;
  readonly disconnect?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly set?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly update?: InputMaybe<ReadonlyArray<CommentUpdateWithWhereUniqueWithoutAuthorInput>>;
  readonly updateMany?: InputMaybe<ReadonlyArray<CommentUpdateManyWithWhereWithoutAuthorInput>>;
  readonly upsert?: InputMaybe<ReadonlyArray<CommentUpsertWithWhereUniqueWithoutAuthorInput>>;
};

export type CommentUpdateManyWithoutPortNestedInput = {
  readonly connect?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<CommentCreateOrConnectWithoutPortInput>>;
  readonly create?: InputMaybe<ReadonlyArray<CommentCreateWithoutPortInput>>;
  readonly createMany?: InputMaybe<CommentCreateManyPortInputEnvelope>;
  readonly delete?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly deleteMany?: InputMaybe<ReadonlyArray<CommentScalarWhereInput>>;
  readonly disconnect?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly set?: InputMaybe<ReadonlyArray<CommentWhereUniqueInput>>;
  readonly update?: InputMaybe<ReadonlyArray<CommentUpdateWithWhereUniqueWithoutPortInput>>;
  readonly updateMany?: InputMaybe<ReadonlyArray<CommentUpdateManyWithWhereWithoutPortInput>>;
  readonly upsert?: InputMaybe<ReadonlyArray<CommentUpsertWithWhereUniqueWithoutPortInput>>;
};

export type CommentUpdateWithWhereUniqueWithoutAuthorInput = {
  readonly data: CommentUpdateWithoutAuthorInput;
  readonly where: CommentWhereUniqueInput;
};

export type CommentUpdateWithWhereUniqueWithoutPortInput = {
  readonly data: CommentUpdateWithoutPortInput;
  readonly where: CommentWhereUniqueInput;
};

export type CommentUpdateWithoutAuthorInput = {
  readonly message?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly port?: InputMaybe<PostUpdateOneRequiredWithoutCommentsNestedInput>;
};

export type CommentUpdateWithoutPortInput = {
  readonly author?: InputMaybe<UserUpdateOneRequiredWithoutCommentsNestedInput>;
  readonly message?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type CommentUpsertWithWhereUniqueWithoutAuthorInput = {
  readonly create: CommentCreateWithoutAuthorInput;
  readonly update: CommentUpdateWithoutAuthorInput;
  readonly where: CommentWhereUniqueInput;
};

export type CommentUpsertWithWhereUniqueWithoutPortInput = {
  readonly create: CommentCreateWithoutPortInput;
  readonly update: CommentUpdateWithoutPortInput;
  readonly where: CommentWhereUniqueInput;
};

export type CommentWhereInput = {
  readonly AND?: InputMaybe<ReadonlyArray<CommentWhereInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<CommentWhereInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<CommentWhereInput>>;
  readonly author?: InputMaybe<UserRelationFilter>;
  readonly authorId?: InputMaybe<StringFilter>;
  readonly id?: InputMaybe<StringFilter>;
  readonly message?: InputMaybe<StringFilter>;
  readonly port?: InputMaybe<PostRelationFilter>;
  readonly postId?: InputMaybe<StringFilter>;
};

export type CommentWhereUniqueInput = {
  readonly id?: InputMaybe<Scalars['String']>;
};

export type Mutation = {
  readonly __typename: 'Mutation';
  readonly createManyComment: AffectedRowsOutput;
  readonly createManyPost: AffectedRowsOutput;
  readonly createManyTag: AffectedRowsOutput;
  readonly createManyUser: AffectedRowsOutput;
  readonly createOneComment: Comment;
  readonly createOnePost: Post;
  readonly createOneTag: Tag;
  readonly createOneUser: User;
  readonly deleteManyComment: AffectedRowsOutput;
  readonly deleteManyPost: AffectedRowsOutput;
  readonly deleteManyTag: AffectedRowsOutput;
  readonly deleteManyUser: AffectedRowsOutput;
  readonly deleteOneComment: Maybe<Comment>;
  readonly deleteOnePost: Maybe<Post>;
  readonly deleteOneTag: Maybe<Tag>;
  readonly deleteOneUser: Maybe<User>;
  readonly signIn: Maybe<AuthUser>;
  readonly signUp: Maybe<AuthUser>;
  readonly updateManyComment: AffectedRowsOutput;
  readonly updateManyPost: AffectedRowsOutput;
  readonly updateManyTag: AffectedRowsOutput;
  readonly updateManyUser: AffectedRowsOutput;
  readonly updateOneComment: Maybe<Comment>;
  readonly updateOnePost: Maybe<Post>;
  readonly updateOneTag: Maybe<Tag>;
  readonly updateOneUser: Maybe<User>;
  readonly updateTest: Test;
  readonly upsertOneComment: Comment;
  readonly upsertOnePost: Post;
  readonly upsertOneTag: Tag;
  readonly upsertOneUser: User;
};


export type MutationcreateManyCommentArgs = {
  data: ReadonlyArray<CommentCreateManyInput>;
};


export type MutationcreateManyPostArgs = {
  data: ReadonlyArray<PostCreateManyInput>;
};


export type MutationcreateManyTagArgs = {
  data: ReadonlyArray<TagCreateManyInput>;
};


export type MutationcreateManyUserArgs = {
  data: ReadonlyArray<UserCreateManyInput>;
};


export type MutationcreateOneCommentArgs = {
  data: CommentCreateInput;
};


export type MutationcreateOnePostArgs = {
  data: PostCreateInput;
};


export type MutationcreateOneTagArgs = {
  data: TagCreateInput;
};


export type MutationcreateOneUserArgs = {
  data: UserCreateInput;
};


export type MutationdeleteManyCommentArgs = {
  where?: InputMaybe<CommentWhereInput>;
};


export type MutationdeleteManyPostArgs = {
  where?: InputMaybe<PostWhereInput>;
};


export type MutationdeleteManyTagArgs = {
  where?: InputMaybe<TagWhereInput>;
};


export type MutationdeleteManyUserArgs = {
  where?: InputMaybe<UserWhereInput>;
};


export type MutationdeleteOneCommentArgs = {
  where: CommentWhereUniqueInput;
};


export type MutationdeleteOnePostArgs = {
  where: PostWhereUniqueInput;
};


export type MutationdeleteOneTagArgs = {
  where: TagWhereUniqueInput;
};


export type MutationdeleteOneUserArgs = {
  where: UserWhereUniqueInput;
};


export type MutationsignInArgs = {
  data: SignInInput;
};


export type MutationsignUpArgs = {
  data: SignUpInput;
};


export type MutationupdateManyCommentArgs = {
  data: CommentUpdateManyMutationInput;
  where?: InputMaybe<CommentWhereInput>;
};


export type MutationupdateManyPostArgs = {
  data: PostUpdateManyMutationInput;
  where?: InputMaybe<PostWhereInput>;
};


export type MutationupdateManyTagArgs = {
  data: TagUpdateManyMutationInput;
  where?: InputMaybe<TagWhereInput>;
};


export type MutationupdateManyUserArgs = {
  data: UserUpdateManyMutationInput;
  where?: InputMaybe<UserWhereInput>;
};


export type MutationupdateOneCommentArgs = {
  data: CommentUpdateInput;
  where: CommentWhereUniqueInput;
};


export type MutationupdateOnePostArgs = {
  data: PostUpdateInput;
  where: PostWhereUniqueInput;
};


export type MutationupdateOneTagArgs = {
  data: TagUpdateInput;
  where: TagWhereUniqueInput;
};


export type MutationupdateOneUserArgs = {
  data: UserUpdateInput;
  where: UserWhereUniqueInput;
};


export type MutationupdateTestArgs = {
  name: Scalars['String'];
};


export type MutationupsertOneCommentArgs = {
  create: CommentCreateInput;
  update: CommentUpdateInput;
  where: CommentWhereUniqueInput;
};


export type MutationupsertOnePostArgs = {
  create: PostCreateInput;
  update: PostUpdateInput;
  where: PostWhereUniqueInput;
};


export type MutationupsertOneTagArgs = {
  create: TagCreateInput;
  update: TagUpdateInput;
  where: TagWhereUniqueInput;
};


export type MutationupsertOneUserArgs = {
  create: UserCreateInput;
  update: UserUpdateInput;
  where: UserWhereUniqueInput;
};

export type NestedIntFilter = {
  readonly equals?: InputMaybe<Scalars['Int']>;
  readonly gt?: InputMaybe<Scalars['Int']>;
  readonly gte?: InputMaybe<Scalars['Int']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['Int']>>;
  readonly lt?: InputMaybe<Scalars['Int']>;
  readonly lte?: InputMaybe<Scalars['Int']>;
  readonly not?: InputMaybe<NestedIntFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['Int']>>;
};

export type NestedIntNullableFilter = {
  readonly equals?: InputMaybe<Scalars['Int']>;
  readonly gt?: InputMaybe<Scalars['Int']>;
  readonly gte?: InputMaybe<Scalars['Int']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['Int']>>;
  readonly isSet?: InputMaybe<Scalars['Boolean']>;
  readonly lt?: InputMaybe<Scalars['Int']>;
  readonly lte?: InputMaybe<Scalars['Int']>;
  readonly not?: InputMaybe<NestedIntNullableFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['Int']>>;
};

export type NestedStringFilter = {
  readonly contains?: InputMaybe<Scalars['String']>;
  readonly endsWith?: InputMaybe<Scalars['String']>;
  readonly equals?: InputMaybe<Scalars['String']>;
  readonly gt?: InputMaybe<Scalars['String']>;
  readonly gte?: InputMaybe<Scalars['String']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly lt?: InputMaybe<Scalars['String']>;
  readonly lte?: InputMaybe<Scalars['String']>;
  readonly not?: InputMaybe<NestedStringFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly startsWith?: InputMaybe<Scalars['String']>;
};

export type NestedStringNullableFilter = {
  readonly contains?: InputMaybe<Scalars['String']>;
  readonly endsWith?: InputMaybe<Scalars['String']>;
  readonly equals?: InputMaybe<Scalars['String']>;
  readonly gt?: InputMaybe<Scalars['String']>;
  readonly gte?: InputMaybe<Scalars['String']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly isSet?: InputMaybe<Scalars['Boolean']>;
  readonly lt?: InputMaybe<Scalars['String']>;
  readonly lte?: InputMaybe<Scalars['String']>;
  readonly not?: InputMaybe<NestedStringNullableFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly startsWith?: InputMaybe<Scalars['String']>;
};

export type NestedStringNullableWithAggregatesFilter = {
  readonly _count?: InputMaybe<NestedIntNullableFilter>;
  readonly _max?: InputMaybe<NestedStringNullableFilter>;
  readonly _min?: InputMaybe<NestedStringNullableFilter>;
  readonly contains?: InputMaybe<Scalars['String']>;
  readonly endsWith?: InputMaybe<Scalars['String']>;
  readonly equals?: InputMaybe<Scalars['String']>;
  readonly gt?: InputMaybe<Scalars['String']>;
  readonly gte?: InputMaybe<Scalars['String']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly isSet?: InputMaybe<Scalars['Boolean']>;
  readonly lt?: InputMaybe<Scalars['String']>;
  readonly lte?: InputMaybe<Scalars['String']>;
  readonly not?: InputMaybe<NestedStringNullableWithAggregatesFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly startsWith?: InputMaybe<Scalars['String']>;
};

export type NestedStringWithAggregatesFilter = {
  readonly _count?: InputMaybe<NestedIntFilter>;
  readonly _max?: InputMaybe<NestedStringFilter>;
  readonly _min?: InputMaybe<NestedStringFilter>;
  readonly contains?: InputMaybe<Scalars['String']>;
  readonly endsWith?: InputMaybe<Scalars['String']>;
  readonly equals?: InputMaybe<Scalars['String']>;
  readonly gt?: InputMaybe<Scalars['String']>;
  readonly gte?: InputMaybe<Scalars['String']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly lt?: InputMaybe<Scalars['String']>;
  readonly lte?: InputMaybe<Scalars['String']>;
  readonly not?: InputMaybe<NestedStringWithAggregatesFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly startsWith?: InputMaybe<Scalars['String']>;
};

export type NullableStringFieldUpdateOperationsInput = {
  readonly set?: InputMaybe<Scalars['String']>;
  readonly unset?: InputMaybe<Scalars['Boolean']>;
};

export type Post = {
  readonly __typename: 'Post';
  readonly _count: Maybe<PostCount>;
  readonly author: User;
  readonly authorId: Scalars['String'];
  readonly comments: ReadonlyArray<Comment>;
  readonly id: Scalars['String'];
  readonly likeIDs: ReadonlyArray<Scalars['String']>;
  readonly likes: ReadonlyArray<User>;
  readonly message: Maybe<Scalars['String']>;
  readonly tagIDs: ReadonlyArray<Scalars['String']>;
  readonly tags: ReadonlyArray<Tag>;
  readonly title: Scalars['String'];
};


export type PostcommentsArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type PostlikesArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<UserWhereInput>;
};


export type PosttagsArgs = {
  cursor?: InputMaybe<TagWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<TagScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<TagOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<TagWhereInput>;
};

export type PostCount = {
  readonly __typename: 'PostCount';
  readonly comments: Scalars['Int'];
  readonly likes: Scalars['Int'];
  readonly tags: Scalars['Int'];
};

export type PostCountAggregate = {
  readonly __typename: 'PostCountAggregate';
  readonly _all: Scalars['Int'];
  readonly authorId: Scalars['Int'];
  readonly id: Scalars['Int'];
  readonly likeIDs: Scalars['Int'];
  readonly message: Scalars['Int'];
  readonly tagIDs: Scalars['Int'];
  readonly title: Scalars['Int'];
};

export type PostCountOrderByAggregateInput = {
  readonly authorId?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly likeIDs?: InputMaybe<SortOrder>;
  readonly message?: InputMaybe<SortOrder>;
  readonly tagIDs?: InputMaybe<SortOrder>;
  readonly title?: InputMaybe<SortOrder>;
};

export type PostCreateInput = {
  readonly author: UserCreateNestedOneWithoutPostsInput;
  readonly comments?: InputMaybe<CommentCreateNestedManyWithoutPortInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  readonly likes?: InputMaybe<UserCreateNestedManyWithoutLikePostsInput>;
  readonly message?: InputMaybe<Scalars['String']>;
  readonly tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  readonly tags?: InputMaybe<TagCreateNestedManyWithoutPostsInput>;
  readonly title: Scalars['String'];
};

export type PostCreateManyAuthorInput = {
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  readonly message?: InputMaybe<Scalars['String']>;
  readonly tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  readonly title: Scalars['String'];
};

export type PostCreateManyAuthorInputEnvelope = {
  readonly data: ReadonlyArray<PostCreateManyAuthorInput>;
};

export type PostCreateManyInput = {
  readonly authorId: Scalars['String'];
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  readonly message?: InputMaybe<Scalars['String']>;
  readonly tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  readonly title: Scalars['String'];
};

export type PostCreateNestedManyWithoutAuthorInput = {
  readonly connect?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<PostCreateOrConnectWithoutAuthorInput>>;
  readonly create?: InputMaybe<ReadonlyArray<PostCreateWithoutAuthorInput>>;
  readonly createMany?: InputMaybe<PostCreateManyAuthorInputEnvelope>;
};

export type PostCreateNestedManyWithoutLikesInput = {
  readonly connect?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<PostCreateOrConnectWithoutLikesInput>>;
  readonly create?: InputMaybe<ReadonlyArray<PostCreateWithoutLikesInput>>;
};

export type PostCreateNestedManyWithoutTagsInput = {
  readonly connect?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<PostCreateOrConnectWithoutTagsInput>>;
  readonly create?: InputMaybe<ReadonlyArray<PostCreateWithoutTagsInput>>;
};

export type PostCreateNestedOneWithoutCommentsInput = {
  readonly connect?: InputMaybe<PostWhereUniqueInput>;
  readonly connectOrCreate?: InputMaybe<PostCreateOrConnectWithoutCommentsInput>;
  readonly create?: InputMaybe<PostCreateWithoutCommentsInput>;
};

export type PostCreateOrConnectWithoutAuthorInput = {
  readonly create: PostCreateWithoutAuthorInput;
  readonly where: PostWhereUniqueInput;
};

export type PostCreateOrConnectWithoutCommentsInput = {
  readonly create: PostCreateWithoutCommentsInput;
  readonly where: PostWhereUniqueInput;
};

export type PostCreateOrConnectWithoutLikesInput = {
  readonly create: PostCreateWithoutLikesInput;
  readonly where: PostWhereUniqueInput;
};

export type PostCreateOrConnectWithoutTagsInput = {
  readonly create: PostCreateWithoutTagsInput;
  readonly where: PostWhereUniqueInput;
};

export type PostCreateWithoutAuthorInput = {
  readonly comments?: InputMaybe<CommentCreateNestedManyWithoutPortInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  readonly likes?: InputMaybe<UserCreateNestedManyWithoutLikePostsInput>;
  readonly message?: InputMaybe<Scalars['String']>;
  readonly tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  readonly tags?: InputMaybe<TagCreateNestedManyWithoutPostsInput>;
  readonly title: Scalars['String'];
};

export type PostCreateWithoutCommentsInput = {
  readonly author: UserCreateNestedOneWithoutPostsInput;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  readonly likes?: InputMaybe<UserCreateNestedManyWithoutLikePostsInput>;
  readonly message?: InputMaybe<Scalars['String']>;
  readonly tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  readonly tags?: InputMaybe<TagCreateNestedManyWithoutPostsInput>;
  readonly title: Scalars['String'];
};

export type PostCreateWithoutLikesInput = {
  readonly author: UserCreateNestedOneWithoutPostsInput;
  readonly comments?: InputMaybe<CommentCreateNestedManyWithoutPortInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  readonly message?: InputMaybe<Scalars['String']>;
  readonly tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  readonly tags?: InputMaybe<TagCreateNestedManyWithoutPostsInput>;
  readonly title: Scalars['String'];
};

export type PostCreateWithoutTagsInput = {
  readonly author: UserCreateNestedOneWithoutPostsInput;
  readonly comments?: InputMaybe<CommentCreateNestedManyWithoutPortInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likeIDs?: InputMaybe<PostCreatelikeIDsInput>;
  readonly likes?: InputMaybe<UserCreateNestedManyWithoutLikePostsInput>;
  readonly message?: InputMaybe<Scalars['String']>;
  readonly tagIDs?: InputMaybe<PostCreatetagIDsInput>;
  readonly title: Scalars['String'];
};

export type PostCreatelikeIDsInput = {
  readonly set: ReadonlyArray<Scalars['String']>;
};

export type PostCreatetagIDsInput = {
  readonly set: ReadonlyArray<Scalars['String']>;
};

export type PostGroupBy = {
  readonly __typename: 'PostGroupBy';
  readonly _count: Maybe<PostCountAggregate>;
  readonly _max: Maybe<PostMaxAggregate>;
  readonly _min: Maybe<PostMinAggregate>;
  readonly authorId: Scalars['String'];
  readonly id: Scalars['String'];
  readonly likeIDs: Maybe<ReadonlyArray<Scalars['String']>>;
  readonly message: Maybe<Scalars['String']>;
  readonly tagIDs: Maybe<ReadonlyArray<Scalars['String']>>;
  readonly title: Scalars['String'];
};

export type PostListRelationFilter = {
  readonly every?: InputMaybe<PostWhereInput>;
  readonly none?: InputMaybe<PostWhereInput>;
  readonly some?: InputMaybe<PostWhereInput>;
};

export type PostMaxAggregate = {
  readonly __typename: 'PostMaxAggregate';
  readonly authorId: Maybe<Scalars['String']>;
  readonly id: Maybe<Scalars['String']>;
  readonly message: Maybe<Scalars['String']>;
  readonly title: Maybe<Scalars['String']>;
};

export type PostMaxOrderByAggregateInput = {
  readonly authorId?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly message?: InputMaybe<SortOrder>;
  readonly title?: InputMaybe<SortOrder>;
};

export type PostMinAggregate = {
  readonly __typename: 'PostMinAggregate';
  readonly authorId: Maybe<Scalars['String']>;
  readonly id: Maybe<Scalars['String']>;
  readonly message: Maybe<Scalars['String']>;
  readonly title: Maybe<Scalars['String']>;
};

export type PostMinOrderByAggregateInput = {
  readonly authorId?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly message?: InputMaybe<SortOrder>;
  readonly title?: InputMaybe<SortOrder>;
};

export type PostOrderByRelationAggregateInput = {
  readonly _count?: InputMaybe<SortOrder>;
};

export type PostOrderByWithAggregationInput = {
  readonly _count?: InputMaybe<PostCountOrderByAggregateInput>;
  readonly _max?: InputMaybe<PostMaxOrderByAggregateInput>;
  readonly _min?: InputMaybe<PostMinOrderByAggregateInput>;
  readonly authorId?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly likeIDs?: InputMaybe<SortOrder>;
  readonly message?: InputMaybe<SortOrder>;
  readonly tagIDs?: InputMaybe<SortOrder>;
  readonly title?: InputMaybe<SortOrder>;
};

export type PostOrderByWithRelationInput = {
  readonly author?: InputMaybe<UserOrderByWithRelationInput>;
  readonly authorId?: InputMaybe<SortOrder>;
  readonly comments?: InputMaybe<CommentOrderByRelationAggregateInput>;
  readonly id?: InputMaybe<SortOrder>;
  readonly likeIDs?: InputMaybe<SortOrder>;
  readonly likes?: InputMaybe<UserOrderByRelationAggregateInput>;
  readonly message?: InputMaybe<SortOrder>;
  readonly tagIDs?: InputMaybe<SortOrder>;
  readonly tags?: InputMaybe<TagOrderByRelationAggregateInput>;
  readonly title?: InputMaybe<SortOrder>;
};

export type PostRelationFilter = {
  readonly is?: InputMaybe<PostWhereInput>;
  readonly isNot?: InputMaybe<PostWhereInput>;
};

export type PostScalarFieldEnum =
  | 'authorId'
  | 'id'
  | 'likeIDs'
  | 'message'
  | 'tagIDs'
  | 'title';

export type PostScalarWhereInput = {
  readonly AND?: InputMaybe<ReadonlyArray<PostScalarWhereInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<PostScalarWhereInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<PostScalarWhereInput>>;
  readonly authorId?: InputMaybe<StringFilter>;
  readonly id?: InputMaybe<StringFilter>;
  readonly likeIDs?: InputMaybe<StringNullableListFilter>;
  readonly message?: InputMaybe<StringNullableFilter>;
  readonly tagIDs?: InputMaybe<StringNullableListFilter>;
  readonly title?: InputMaybe<StringFilter>;
};

export type PostScalarWhereWithAggregatesInput = {
  readonly AND?: InputMaybe<ReadonlyArray<PostScalarWhereWithAggregatesInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<PostScalarWhereWithAggregatesInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<PostScalarWhereWithAggregatesInput>>;
  readonly authorId?: InputMaybe<StringWithAggregatesFilter>;
  readonly id?: InputMaybe<StringWithAggregatesFilter>;
  readonly likeIDs?: InputMaybe<StringNullableListFilter>;
  readonly message?: InputMaybe<StringNullableWithAggregatesFilter>;
  readonly tagIDs?: InputMaybe<StringNullableListFilter>;
  readonly title?: InputMaybe<StringWithAggregatesFilter>;
};

export type PostUpdateInput = {
  readonly author?: InputMaybe<UserUpdateOneRequiredWithoutPostsNestedInput>;
  readonly comments?: InputMaybe<CommentUpdateManyWithoutPortNestedInput>;
  readonly likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  readonly likes?: InputMaybe<UserUpdateManyWithoutLikePostsNestedInput>;
  readonly message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  readonly tags?: InputMaybe<TagUpdateManyWithoutPostsNestedInput>;
  readonly title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateManyMutationInput = {
  readonly likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  readonly message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  readonly title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateManyWithWhereWithoutAuthorInput = {
  readonly data: PostUpdateManyMutationInput;
  readonly where: PostScalarWhereInput;
};

export type PostUpdateManyWithWhereWithoutLikesInput = {
  readonly data: PostUpdateManyMutationInput;
  readonly where: PostScalarWhereInput;
};

export type PostUpdateManyWithWhereWithoutTagsInput = {
  readonly data: PostUpdateManyMutationInput;
  readonly where: PostScalarWhereInput;
};

export type PostUpdateManyWithoutAuthorNestedInput = {
  readonly connect?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<PostCreateOrConnectWithoutAuthorInput>>;
  readonly create?: InputMaybe<ReadonlyArray<PostCreateWithoutAuthorInput>>;
  readonly createMany?: InputMaybe<PostCreateManyAuthorInputEnvelope>;
  readonly delete?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly deleteMany?: InputMaybe<ReadonlyArray<PostScalarWhereInput>>;
  readonly disconnect?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly set?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly update?: InputMaybe<ReadonlyArray<PostUpdateWithWhereUniqueWithoutAuthorInput>>;
  readonly updateMany?: InputMaybe<ReadonlyArray<PostUpdateManyWithWhereWithoutAuthorInput>>;
  readonly upsert?: InputMaybe<ReadonlyArray<PostUpsertWithWhereUniqueWithoutAuthorInput>>;
};

export type PostUpdateManyWithoutLikesNestedInput = {
  readonly connect?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<PostCreateOrConnectWithoutLikesInput>>;
  readonly create?: InputMaybe<ReadonlyArray<PostCreateWithoutLikesInput>>;
  readonly delete?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly deleteMany?: InputMaybe<ReadonlyArray<PostScalarWhereInput>>;
  readonly disconnect?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly set?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly update?: InputMaybe<ReadonlyArray<PostUpdateWithWhereUniqueWithoutLikesInput>>;
  readonly updateMany?: InputMaybe<ReadonlyArray<PostUpdateManyWithWhereWithoutLikesInput>>;
  readonly upsert?: InputMaybe<ReadonlyArray<PostUpsertWithWhereUniqueWithoutLikesInput>>;
};

export type PostUpdateManyWithoutTagsNestedInput = {
  readonly connect?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<PostCreateOrConnectWithoutTagsInput>>;
  readonly create?: InputMaybe<ReadonlyArray<PostCreateWithoutTagsInput>>;
  readonly delete?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly deleteMany?: InputMaybe<ReadonlyArray<PostScalarWhereInput>>;
  readonly disconnect?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly set?: InputMaybe<ReadonlyArray<PostWhereUniqueInput>>;
  readonly update?: InputMaybe<ReadonlyArray<PostUpdateWithWhereUniqueWithoutTagsInput>>;
  readonly updateMany?: InputMaybe<ReadonlyArray<PostUpdateManyWithWhereWithoutTagsInput>>;
  readonly upsert?: InputMaybe<ReadonlyArray<PostUpsertWithWhereUniqueWithoutTagsInput>>;
};

export type PostUpdateOneRequiredWithoutCommentsNestedInput = {
  readonly connect?: InputMaybe<PostWhereUniqueInput>;
  readonly connectOrCreate?: InputMaybe<PostCreateOrConnectWithoutCommentsInput>;
  readonly create?: InputMaybe<PostCreateWithoutCommentsInput>;
  readonly update?: InputMaybe<PostUpdateWithoutCommentsInput>;
  readonly upsert?: InputMaybe<PostUpsertWithoutCommentsInput>;
};

export type PostUpdateWithWhereUniqueWithoutAuthorInput = {
  readonly data: PostUpdateWithoutAuthorInput;
  readonly where: PostWhereUniqueInput;
};

export type PostUpdateWithWhereUniqueWithoutLikesInput = {
  readonly data: PostUpdateWithoutLikesInput;
  readonly where: PostWhereUniqueInput;
};

export type PostUpdateWithWhereUniqueWithoutTagsInput = {
  readonly data: PostUpdateWithoutTagsInput;
  readonly where: PostWhereUniqueInput;
};

export type PostUpdateWithoutAuthorInput = {
  readonly comments?: InputMaybe<CommentUpdateManyWithoutPortNestedInput>;
  readonly likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  readonly likes?: InputMaybe<UserUpdateManyWithoutLikePostsNestedInput>;
  readonly message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  readonly tags?: InputMaybe<TagUpdateManyWithoutPostsNestedInput>;
  readonly title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateWithoutCommentsInput = {
  readonly author?: InputMaybe<UserUpdateOneRequiredWithoutPostsNestedInput>;
  readonly likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  readonly likes?: InputMaybe<UserUpdateManyWithoutLikePostsNestedInput>;
  readonly message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  readonly tags?: InputMaybe<TagUpdateManyWithoutPostsNestedInput>;
  readonly title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateWithoutLikesInput = {
  readonly author?: InputMaybe<UserUpdateOneRequiredWithoutPostsNestedInput>;
  readonly comments?: InputMaybe<CommentUpdateManyWithoutPortNestedInput>;
  readonly likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  readonly message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  readonly tags?: InputMaybe<TagUpdateManyWithoutPostsNestedInput>;
  readonly title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdateWithoutTagsInput = {
  readonly author?: InputMaybe<UserUpdateOneRequiredWithoutPostsNestedInput>;
  readonly comments?: InputMaybe<CommentUpdateManyWithoutPortNestedInput>;
  readonly likeIDs?: InputMaybe<PostUpdatelikeIDsInput>;
  readonly likes?: InputMaybe<UserUpdateManyWithoutLikePostsNestedInput>;
  readonly message?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly tagIDs?: InputMaybe<PostUpdatetagIDsInput>;
  readonly title?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type PostUpdatelikeIDsInput = {
  readonly push?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly set?: InputMaybe<ReadonlyArray<Scalars['String']>>;
};

export type PostUpdatetagIDsInput = {
  readonly push?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly set?: InputMaybe<ReadonlyArray<Scalars['String']>>;
};

export type PostUpsertWithWhereUniqueWithoutAuthorInput = {
  readonly create: PostCreateWithoutAuthorInput;
  readonly update: PostUpdateWithoutAuthorInput;
  readonly where: PostWhereUniqueInput;
};

export type PostUpsertWithWhereUniqueWithoutLikesInput = {
  readonly create: PostCreateWithoutLikesInput;
  readonly update: PostUpdateWithoutLikesInput;
  readonly where: PostWhereUniqueInput;
};

export type PostUpsertWithWhereUniqueWithoutTagsInput = {
  readonly create: PostCreateWithoutTagsInput;
  readonly update: PostUpdateWithoutTagsInput;
  readonly where: PostWhereUniqueInput;
};

export type PostUpsertWithoutCommentsInput = {
  readonly create: PostCreateWithoutCommentsInput;
  readonly update: PostUpdateWithoutCommentsInput;
};

export type PostWhereInput = {
  readonly AND?: InputMaybe<ReadonlyArray<PostWhereInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<PostWhereInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<PostWhereInput>>;
  readonly author?: InputMaybe<UserRelationFilter>;
  readonly authorId?: InputMaybe<StringFilter>;
  readonly comments?: InputMaybe<CommentListRelationFilter>;
  readonly id?: InputMaybe<StringFilter>;
  readonly likeIDs?: InputMaybe<StringNullableListFilter>;
  readonly likes?: InputMaybe<UserListRelationFilter>;
  readonly message?: InputMaybe<StringNullableFilter>;
  readonly tagIDs?: InputMaybe<StringNullableListFilter>;
  readonly tags?: InputMaybe<TagListRelationFilter>;
  readonly title?: InputMaybe<StringFilter>;
};

export type PostWhereUniqueInput = {
  readonly id?: InputMaybe<Scalars['String']>;
};

export type Query = {
  readonly __typename: 'Query';
  readonly aggregateComment: AggregateComment;
  readonly aggregatePost: AggregatePost;
  readonly aggregateTag: AggregateTag;
  readonly aggregateUser: AggregateUser;
  readonly comment: Maybe<Comment>;
  readonly comments: ReadonlyArray<Comment>;
  readonly findFirstComment: Maybe<Comment>;
  readonly findFirstPost: Maybe<Post>;
  readonly findFirstTag: Maybe<Tag>;
  readonly findFirstUser: Maybe<User>;
  readonly groupByComment: ReadonlyArray<CommentGroupBy>;
  readonly groupByPost: ReadonlyArray<PostGroupBy>;
  readonly groupByTag: ReadonlyArray<TagGroupBy>;
  readonly groupByUser: ReadonlyArray<UserGroupBy>;
  readonly post: Maybe<Post>;
  readonly posts: ReadonlyArray<Post>;
  readonly tag: Maybe<Tag>;
  readonly tags: ReadonlyArray<Tag>;
  readonly test: Test;
  readonly user: Maybe<User>;
  readonly users: ReadonlyArray<User>;
};


export type QueryaggregateCommentArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  orderBy?: InputMaybe<ReadonlyArray<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type QueryaggregatePostArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  orderBy?: InputMaybe<ReadonlyArray<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QueryaggregateTagArgs = {
  cursor?: InputMaybe<TagWhereUniqueInput>;
  orderBy?: InputMaybe<ReadonlyArray<TagOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<TagWhereInput>;
};


export type QueryaggregateUserArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  orderBy?: InputMaybe<ReadonlyArray<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<UserWhereInput>;
};


export type QuerycommentArgs = {
  where: CommentWhereUniqueInput;
};


export type QuerycommentsArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type QueryfindFirstCommentArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type QueryfindFirstPostArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QueryfindFirstTagArgs = {
  cursor?: InputMaybe<TagWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<TagScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<TagOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<TagWhereInput>;
};


export type QueryfindFirstUserArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<UserWhereInput>;
};


export type QuerygroupByCommentArgs = {
  by: ReadonlyArray<CommentScalarFieldEnum>;
  having?: InputMaybe<CommentScalarWhereWithAggregatesInput>;
  orderBy?: InputMaybe<ReadonlyArray<CommentOrderByWithAggregationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type QuerygroupByPostArgs = {
  by: ReadonlyArray<PostScalarFieldEnum>;
  having?: InputMaybe<PostScalarWhereWithAggregatesInput>;
  orderBy?: InputMaybe<ReadonlyArray<PostOrderByWithAggregationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QuerygroupByTagArgs = {
  by: ReadonlyArray<TagScalarFieldEnum>;
  having?: InputMaybe<TagScalarWhereWithAggregatesInput>;
  orderBy?: InputMaybe<ReadonlyArray<TagOrderByWithAggregationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<TagWhereInput>;
};


export type QuerygroupByUserArgs = {
  by: ReadonlyArray<UserScalarFieldEnum>;
  having?: InputMaybe<UserScalarWhereWithAggregatesInput>;
  orderBy?: InputMaybe<ReadonlyArray<UserOrderByWithAggregationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<UserWhereInput>;
};


export type QuerypostArgs = {
  where: PostWhereUniqueInput;
};


export type QuerypostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QuerytagArgs = {
  where: TagWhereUniqueInput;
};


export type QuerytagsArgs = {
  cursor?: InputMaybe<TagWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<TagScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<TagOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<TagWhereInput>;
};


export type QueryuserArgs = {
  where: UserWhereUniqueInput;
};


export type QueryusersArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<UserWhereInput>;
};

export type QueryMode =
  | 'default'
  | 'insensitive';

export type SignInInput = {
  readonly email: Scalars['String'];
  readonly password: Scalars['String'];
};

export type SignUpInput = {
  readonly email: Scalars['String'];
  readonly name?: InputMaybe<Scalars['String']>;
  readonly password: Scalars['String'];
};

export type SortOrder =
  | 'asc'
  | 'desc';

export type StringFieldUpdateOperationsInput = {
  readonly set?: InputMaybe<Scalars['String']>;
};

export type StringFilter = {
  readonly contains?: InputMaybe<Scalars['String']>;
  readonly endsWith?: InputMaybe<Scalars['String']>;
  readonly equals?: InputMaybe<Scalars['String']>;
  readonly gt?: InputMaybe<Scalars['String']>;
  readonly gte?: InputMaybe<Scalars['String']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly lt?: InputMaybe<Scalars['String']>;
  readonly lte?: InputMaybe<Scalars['String']>;
  readonly mode?: InputMaybe<QueryMode>;
  readonly not?: InputMaybe<NestedStringFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly startsWith?: InputMaybe<Scalars['String']>;
};

export type StringNullableFilter = {
  readonly contains?: InputMaybe<Scalars['String']>;
  readonly endsWith?: InputMaybe<Scalars['String']>;
  readonly equals?: InputMaybe<Scalars['String']>;
  readonly gt?: InputMaybe<Scalars['String']>;
  readonly gte?: InputMaybe<Scalars['String']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly isSet?: InputMaybe<Scalars['Boolean']>;
  readonly lt?: InputMaybe<Scalars['String']>;
  readonly lte?: InputMaybe<Scalars['String']>;
  readonly mode?: InputMaybe<QueryMode>;
  readonly not?: InputMaybe<NestedStringNullableFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly startsWith?: InputMaybe<Scalars['String']>;
};

export type StringNullableListFilter = {
  readonly equals?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly has?: InputMaybe<Scalars['String']>;
  readonly hasEvery?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly hasSome?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly isEmpty?: InputMaybe<Scalars['Boolean']>;
};

export type StringNullableWithAggregatesFilter = {
  readonly _count?: InputMaybe<NestedIntNullableFilter>;
  readonly _max?: InputMaybe<NestedStringNullableFilter>;
  readonly _min?: InputMaybe<NestedStringNullableFilter>;
  readonly contains?: InputMaybe<Scalars['String']>;
  readonly endsWith?: InputMaybe<Scalars['String']>;
  readonly equals?: InputMaybe<Scalars['String']>;
  readonly gt?: InputMaybe<Scalars['String']>;
  readonly gte?: InputMaybe<Scalars['String']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly isSet?: InputMaybe<Scalars['Boolean']>;
  readonly lt?: InputMaybe<Scalars['String']>;
  readonly lte?: InputMaybe<Scalars['String']>;
  readonly mode?: InputMaybe<QueryMode>;
  readonly not?: InputMaybe<NestedStringNullableWithAggregatesFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly startsWith?: InputMaybe<Scalars['String']>;
};

export type StringWithAggregatesFilter = {
  readonly _count?: InputMaybe<NestedIntFilter>;
  readonly _max?: InputMaybe<NestedStringFilter>;
  readonly _min?: InputMaybe<NestedStringFilter>;
  readonly contains?: InputMaybe<Scalars['String']>;
  readonly endsWith?: InputMaybe<Scalars['String']>;
  readonly equals?: InputMaybe<Scalars['String']>;
  readonly gt?: InputMaybe<Scalars['String']>;
  readonly gte?: InputMaybe<Scalars['String']>;
  readonly in?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly lt?: InputMaybe<Scalars['String']>;
  readonly lte?: InputMaybe<Scalars['String']>;
  readonly mode?: InputMaybe<QueryMode>;
  readonly not?: InputMaybe<NestedStringWithAggregatesFilter>;
  readonly notIn?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly startsWith?: InputMaybe<Scalars['String']>;
};

export type Tag = {
  readonly __typename: 'Tag';
  readonly _count: Maybe<TagCount>;
  readonly id: Scalars['String'];
  readonly name: Scalars['String'];
  readonly postIDs: ReadonlyArray<Scalars['String']>;
  readonly posts: ReadonlyArray<Post>;
};


export type TagpostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<PostWhereInput>;
};

export type TagCount = {
  readonly __typename: 'TagCount';
  readonly posts: Scalars['Int'];
};

export type TagCountAggregate = {
  readonly __typename: 'TagCountAggregate';
  readonly _all: Scalars['Int'];
  readonly id: Scalars['Int'];
  readonly name: Scalars['Int'];
  readonly postIDs: Scalars['Int'];
};

export type TagCountOrderByAggregateInput = {
  readonly id?: InputMaybe<SortOrder>;
  readonly name?: InputMaybe<SortOrder>;
  readonly postIDs?: InputMaybe<SortOrder>;
};

export type TagCreateInput = {
  readonly id?: InputMaybe<Scalars['String']>;
  readonly name: Scalars['String'];
  readonly postIDs?: InputMaybe<TagCreatepostIDsInput>;
  readonly posts?: InputMaybe<PostCreateNestedManyWithoutTagsInput>;
};

export type TagCreateManyInput = {
  readonly id?: InputMaybe<Scalars['String']>;
  readonly name: Scalars['String'];
  readonly postIDs?: InputMaybe<TagCreatepostIDsInput>;
};

export type TagCreateNestedManyWithoutPostsInput = {
  readonly connect?: InputMaybe<ReadonlyArray<TagWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<TagCreateOrConnectWithoutPostsInput>>;
  readonly create?: InputMaybe<ReadonlyArray<TagCreateWithoutPostsInput>>;
};

export type TagCreateOrConnectWithoutPostsInput = {
  readonly create: TagCreateWithoutPostsInput;
  readonly where: TagWhereUniqueInput;
};

export type TagCreateWithoutPostsInput = {
  readonly id?: InputMaybe<Scalars['String']>;
  readonly name: Scalars['String'];
  readonly postIDs?: InputMaybe<TagCreatepostIDsInput>;
};

export type TagCreatepostIDsInput = {
  readonly set: ReadonlyArray<Scalars['String']>;
};

export type TagGroupBy = {
  readonly __typename: 'TagGroupBy';
  readonly _count: Maybe<TagCountAggregate>;
  readonly _max: Maybe<TagMaxAggregate>;
  readonly _min: Maybe<TagMinAggregate>;
  readonly id: Scalars['String'];
  readonly name: Scalars['String'];
  readonly postIDs: Maybe<ReadonlyArray<Scalars['String']>>;
};

export type TagListRelationFilter = {
  readonly every?: InputMaybe<TagWhereInput>;
  readonly none?: InputMaybe<TagWhereInput>;
  readonly some?: InputMaybe<TagWhereInput>;
};

export type TagMaxAggregate = {
  readonly __typename: 'TagMaxAggregate';
  readonly id: Maybe<Scalars['String']>;
  readonly name: Maybe<Scalars['String']>;
};

export type TagMaxOrderByAggregateInput = {
  readonly id?: InputMaybe<SortOrder>;
  readonly name?: InputMaybe<SortOrder>;
};

export type TagMinAggregate = {
  readonly __typename: 'TagMinAggregate';
  readonly id: Maybe<Scalars['String']>;
  readonly name: Maybe<Scalars['String']>;
};

export type TagMinOrderByAggregateInput = {
  readonly id?: InputMaybe<SortOrder>;
  readonly name?: InputMaybe<SortOrder>;
};

export type TagOrderByRelationAggregateInput = {
  readonly _count?: InputMaybe<SortOrder>;
};

export type TagOrderByWithAggregationInput = {
  readonly _count?: InputMaybe<TagCountOrderByAggregateInput>;
  readonly _max?: InputMaybe<TagMaxOrderByAggregateInput>;
  readonly _min?: InputMaybe<TagMinOrderByAggregateInput>;
  readonly id?: InputMaybe<SortOrder>;
  readonly name?: InputMaybe<SortOrder>;
  readonly postIDs?: InputMaybe<SortOrder>;
};

export type TagOrderByWithRelationInput = {
  readonly id?: InputMaybe<SortOrder>;
  readonly name?: InputMaybe<SortOrder>;
  readonly postIDs?: InputMaybe<SortOrder>;
  readonly posts?: InputMaybe<PostOrderByRelationAggregateInput>;
};

export type TagScalarFieldEnum =
  | 'id'
  | 'name'
  | 'postIDs';

export type TagScalarWhereInput = {
  readonly AND?: InputMaybe<ReadonlyArray<TagScalarWhereInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<TagScalarWhereInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<TagScalarWhereInput>>;
  readonly id?: InputMaybe<StringFilter>;
  readonly name?: InputMaybe<StringFilter>;
  readonly postIDs?: InputMaybe<StringNullableListFilter>;
};

export type TagScalarWhereWithAggregatesInput = {
  readonly AND?: InputMaybe<ReadonlyArray<TagScalarWhereWithAggregatesInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<TagScalarWhereWithAggregatesInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<TagScalarWhereWithAggregatesInput>>;
  readonly id?: InputMaybe<StringWithAggregatesFilter>;
  readonly name?: InputMaybe<StringWithAggregatesFilter>;
  readonly postIDs?: InputMaybe<StringNullableListFilter>;
};

export type TagUpdateInput = {
  readonly name?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly postIDs?: InputMaybe<TagUpdatepostIDsInput>;
  readonly posts?: InputMaybe<PostUpdateManyWithoutTagsNestedInput>;
};

export type TagUpdateManyMutationInput = {
  readonly name?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly postIDs?: InputMaybe<TagUpdatepostIDsInput>;
};

export type TagUpdateManyWithWhereWithoutPostsInput = {
  readonly data: TagUpdateManyMutationInput;
  readonly where: TagScalarWhereInput;
};

export type TagUpdateManyWithoutPostsNestedInput = {
  readonly connect?: InputMaybe<ReadonlyArray<TagWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<TagCreateOrConnectWithoutPostsInput>>;
  readonly create?: InputMaybe<ReadonlyArray<TagCreateWithoutPostsInput>>;
  readonly delete?: InputMaybe<ReadonlyArray<TagWhereUniqueInput>>;
  readonly deleteMany?: InputMaybe<ReadonlyArray<TagScalarWhereInput>>;
  readonly disconnect?: InputMaybe<ReadonlyArray<TagWhereUniqueInput>>;
  readonly set?: InputMaybe<ReadonlyArray<TagWhereUniqueInput>>;
  readonly update?: InputMaybe<ReadonlyArray<TagUpdateWithWhereUniqueWithoutPostsInput>>;
  readonly updateMany?: InputMaybe<ReadonlyArray<TagUpdateManyWithWhereWithoutPostsInput>>;
  readonly upsert?: InputMaybe<ReadonlyArray<TagUpsertWithWhereUniqueWithoutPostsInput>>;
};

export type TagUpdateWithWhereUniqueWithoutPostsInput = {
  readonly data: TagUpdateWithoutPostsInput;
  readonly where: TagWhereUniqueInput;
};

export type TagUpdateWithoutPostsInput = {
  readonly name?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly postIDs?: InputMaybe<TagUpdatepostIDsInput>;
};

export type TagUpdatepostIDsInput = {
  readonly push?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly set?: InputMaybe<ReadonlyArray<Scalars['String']>>;
};

export type TagUpsertWithWhereUniqueWithoutPostsInput = {
  readonly create: TagCreateWithoutPostsInput;
  readonly update: TagUpdateWithoutPostsInput;
  readonly where: TagWhereUniqueInput;
};

export type TagWhereInput = {
  readonly AND?: InputMaybe<ReadonlyArray<TagWhereInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<TagWhereInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<TagWhereInput>>;
  readonly id?: InputMaybe<StringFilter>;
  readonly name?: InputMaybe<StringFilter>;
  readonly postIDs?: InputMaybe<StringNullableListFilter>;
  readonly posts?: InputMaybe<PostListRelationFilter>;
};

export type TagWhereUniqueInput = {
  readonly id?: InputMaybe<Scalars['String']>;
};

export type Test = {
  readonly __typename: 'Test';
  /** Database id */
  readonly id: Scalars['ID'];
  /** User's real world name */
  readonly name: Scalars['String'];
};

export type User = {
  readonly __typename: 'User';
  readonly _count: Maybe<UserCount>;
  readonly comments: ReadonlyArray<Comment>;
  readonly email: Scalars['String'];
  readonly followerIDs: ReadonlyArray<Scalars['String']>;
  readonly followers: ReadonlyArray<User>;
  readonly following: ReadonlyArray<User>;
  readonly followingIDs: ReadonlyArray<Scalars['String']>;
  readonly id: Scalars['String'];
  readonly likePostIDs: ReadonlyArray<Scalars['String']>;
  readonly likePosts: ReadonlyArray<Post>;
  readonly name: Maybe<Scalars['String']>;
  readonly posts: ReadonlyArray<Post>;
};


export type UsercommentsArgs = {
  cursor?: InputMaybe<CommentWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<CommentScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<CommentOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<CommentWhereInput>;
};


export type UserfollowersArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<UserWhereInput>;
};


export type UserfollowingArgs = {
  cursor?: InputMaybe<UserWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<UserScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<UserOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<UserWhereInput>;
};


export type UserlikePostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<PostWhereInput>;
};


export type UserpostsArgs = {
  cursor?: InputMaybe<PostWhereUniqueInput>;
  distinct?: InputMaybe<ReadonlyArray<PostScalarFieldEnum>>;
  orderBy?: InputMaybe<ReadonlyArray<PostOrderByWithRelationInput>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<PostWhereInput>;
};

export type UserCount = {
  readonly __typename: 'UserCount';
  readonly comments: Scalars['Int'];
  readonly followers: Scalars['Int'];
  readonly following: Scalars['Int'];
  readonly likePosts: Scalars['Int'];
  readonly posts: Scalars['Int'];
};

export type UserCountAggregate = {
  readonly __typename: 'UserCountAggregate';
  readonly _all: Scalars['Int'];
  readonly email: Scalars['Int'];
  readonly followerIDs: Scalars['Int'];
  readonly followingIDs: Scalars['Int'];
  readonly id: Scalars['Int'];
  readonly likePostIDs: Scalars['Int'];
  readonly name: Scalars['Int'];
  readonly password: Scalars['Int'];
  readonly roles: Scalars['Int'];
};

export type UserCountOrderByAggregateInput = {
  readonly email?: InputMaybe<SortOrder>;
  readonly followerIDs?: InputMaybe<SortOrder>;
  readonly followingIDs?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly likePostIDs?: InputMaybe<SortOrder>;
  readonly name?: InputMaybe<SortOrder>;
  readonly password?: InputMaybe<SortOrder>;
  readonly roles?: InputMaybe<SortOrder>;
};

export type UserCreateInput = {
  readonly comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  readonly email: Scalars['String'];
  readonly followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  readonly following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  readonly followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  readonly name?: InputMaybe<Scalars['String']>;
  readonly password?: InputMaybe<Scalars['String']>;
  readonly posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  readonly roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateManyInput = {
  readonly email: Scalars['String'];
  readonly followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  readonly followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  readonly name?: InputMaybe<Scalars['String']>;
  readonly password?: InputMaybe<Scalars['String']>;
  readonly roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateNestedManyWithoutFollowersInput = {
  readonly connect?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<UserCreateOrConnectWithoutFollowersInput>>;
  readonly create?: InputMaybe<ReadonlyArray<UserCreateWithoutFollowersInput>>;
};

export type UserCreateNestedManyWithoutFollowingInput = {
  readonly connect?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<UserCreateOrConnectWithoutFollowingInput>>;
  readonly create?: InputMaybe<ReadonlyArray<UserCreateWithoutFollowingInput>>;
};

export type UserCreateNestedManyWithoutLikePostsInput = {
  readonly connect?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<UserCreateOrConnectWithoutLikePostsInput>>;
  readonly create?: InputMaybe<ReadonlyArray<UserCreateWithoutLikePostsInput>>;
};

export type UserCreateNestedOneWithoutCommentsInput = {
  readonly connect?: InputMaybe<UserWhereUniqueInput>;
  readonly connectOrCreate?: InputMaybe<UserCreateOrConnectWithoutCommentsInput>;
  readonly create?: InputMaybe<UserCreateWithoutCommentsInput>;
};

export type UserCreateNestedOneWithoutPostsInput = {
  readonly connect?: InputMaybe<UserWhereUniqueInput>;
  readonly connectOrCreate?: InputMaybe<UserCreateOrConnectWithoutPostsInput>;
  readonly create?: InputMaybe<UserCreateWithoutPostsInput>;
};

export type UserCreateOrConnectWithoutCommentsInput = {
  readonly create: UserCreateWithoutCommentsInput;
  readonly where: UserWhereUniqueInput;
};

export type UserCreateOrConnectWithoutFollowersInput = {
  readonly create: UserCreateWithoutFollowersInput;
  readonly where: UserWhereUniqueInput;
};

export type UserCreateOrConnectWithoutFollowingInput = {
  readonly create: UserCreateWithoutFollowingInput;
  readonly where: UserWhereUniqueInput;
};

export type UserCreateOrConnectWithoutLikePostsInput = {
  readonly create: UserCreateWithoutLikePostsInput;
  readonly where: UserWhereUniqueInput;
};

export type UserCreateOrConnectWithoutPostsInput = {
  readonly create: UserCreateWithoutPostsInput;
  readonly where: UserWhereUniqueInput;
};

export type UserCreateWithoutCommentsInput = {
  readonly email: Scalars['String'];
  readonly followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  readonly following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  readonly followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  readonly name?: InputMaybe<Scalars['String']>;
  readonly password?: InputMaybe<Scalars['String']>;
  readonly posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  readonly roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateWithoutFollowersInput = {
  readonly comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  readonly email: Scalars['String'];
  readonly followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  readonly following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  readonly followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  readonly name?: InputMaybe<Scalars['String']>;
  readonly password?: InputMaybe<Scalars['String']>;
  readonly posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  readonly roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateWithoutFollowingInput = {
  readonly comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  readonly email: Scalars['String'];
  readonly followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  readonly followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  readonly name?: InputMaybe<Scalars['String']>;
  readonly password?: InputMaybe<Scalars['String']>;
  readonly posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  readonly roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateWithoutLikePostsInput = {
  readonly comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  readonly email: Scalars['String'];
  readonly followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  readonly following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  readonly followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  readonly name?: InputMaybe<Scalars['String']>;
  readonly password?: InputMaybe<Scalars['String']>;
  readonly posts?: InputMaybe<PostCreateNestedManyWithoutAuthorInput>;
  readonly roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreateWithoutPostsInput = {
  readonly comments?: InputMaybe<CommentCreateNestedManyWithoutAuthorInput>;
  readonly email: Scalars['String'];
  readonly followerIDs?: InputMaybe<UserCreatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserCreateNestedManyWithoutFollowingInput>;
  readonly following?: InputMaybe<UserCreateNestedManyWithoutFollowersInput>;
  readonly followingIDs?: InputMaybe<UserCreatefollowingIDsInput>;
  readonly id?: InputMaybe<Scalars['String']>;
  readonly likePostIDs?: InputMaybe<UserCreatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostCreateNestedManyWithoutLikesInput>;
  readonly name?: InputMaybe<Scalars['String']>;
  readonly password?: InputMaybe<Scalars['String']>;
  readonly roles?: InputMaybe<UserCreaterolesInput>;
};

export type UserCreatefollowerIDsInput = {
  readonly set: ReadonlyArray<Scalars['String']>;
};

export type UserCreatefollowingIDsInput = {
  readonly set: ReadonlyArray<Scalars['String']>;
};

export type UserCreatelikePostIDsInput = {
  readonly set: ReadonlyArray<Scalars['String']>;
};

export type UserCreaterolesInput = {
  readonly set: ReadonlyArray<Scalars['String']>;
};

export type UserGroupBy = {
  readonly __typename: 'UserGroupBy';
  readonly _count: Maybe<UserCountAggregate>;
  readonly _max: Maybe<UserMaxAggregate>;
  readonly _min: Maybe<UserMinAggregate>;
  readonly email: Scalars['String'];
  readonly followerIDs: Maybe<ReadonlyArray<Scalars['String']>>;
  readonly followingIDs: Maybe<ReadonlyArray<Scalars['String']>>;
  readonly id: Scalars['String'];
  readonly likePostIDs: Maybe<ReadonlyArray<Scalars['String']>>;
  readonly name: Maybe<Scalars['String']>;
  readonly password: Maybe<Scalars['String']>;
  readonly roles: Maybe<ReadonlyArray<Scalars['String']>>;
};

export type UserListRelationFilter = {
  readonly every?: InputMaybe<UserWhereInput>;
  readonly none?: InputMaybe<UserWhereInput>;
  readonly some?: InputMaybe<UserWhereInput>;
};

export type UserMaxAggregate = {
  readonly __typename: 'UserMaxAggregate';
  readonly email: Maybe<Scalars['String']>;
  readonly id: Maybe<Scalars['String']>;
  readonly name: Maybe<Scalars['String']>;
  readonly password: Maybe<Scalars['String']>;
};

export type UserMaxOrderByAggregateInput = {
  readonly email?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly name?: InputMaybe<SortOrder>;
  readonly password?: InputMaybe<SortOrder>;
};

export type UserMinAggregate = {
  readonly __typename: 'UserMinAggregate';
  readonly email: Maybe<Scalars['String']>;
  readonly id: Maybe<Scalars['String']>;
  readonly name: Maybe<Scalars['String']>;
  readonly password: Maybe<Scalars['String']>;
};

export type UserMinOrderByAggregateInput = {
  readonly email?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly name?: InputMaybe<SortOrder>;
  readonly password?: InputMaybe<SortOrder>;
};

export type UserOrderByRelationAggregateInput = {
  readonly _count?: InputMaybe<SortOrder>;
};

export type UserOrderByWithAggregationInput = {
  readonly _count?: InputMaybe<UserCountOrderByAggregateInput>;
  readonly _max?: InputMaybe<UserMaxOrderByAggregateInput>;
  readonly _min?: InputMaybe<UserMinOrderByAggregateInput>;
  readonly email?: InputMaybe<SortOrder>;
  readonly followerIDs?: InputMaybe<SortOrder>;
  readonly followingIDs?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly likePostIDs?: InputMaybe<SortOrder>;
  readonly name?: InputMaybe<SortOrder>;
  readonly password?: InputMaybe<SortOrder>;
  readonly roles?: InputMaybe<SortOrder>;
};

export type UserOrderByWithRelationInput = {
  readonly comments?: InputMaybe<CommentOrderByRelationAggregateInput>;
  readonly email?: InputMaybe<SortOrder>;
  readonly followerIDs?: InputMaybe<SortOrder>;
  readonly followers?: InputMaybe<UserOrderByRelationAggregateInput>;
  readonly following?: InputMaybe<UserOrderByRelationAggregateInput>;
  readonly followingIDs?: InputMaybe<SortOrder>;
  readonly id?: InputMaybe<SortOrder>;
  readonly likePostIDs?: InputMaybe<SortOrder>;
  readonly likePosts?: InputMaybe<PostOrderByRelationAggregateInput>;
  readonly name?: InputMaybe<SortOrder>;
  readonly password?: InputMaybe<SortOrder>;
  readonly posts?: InputMaybe<PostOrderByRelationAggregateInput>;
  readonly roles?: InputMaybe<SortOrder>;
};

export type UserRelationFilter = {
  readonly is?: InputMaybe<UserWhereInput>;
  readonly isNot?: InputMaybe<UserWhereInput>;
};

export type UserScalarFieldEnum =
  | 'email'
  | 'followerIDs'
  | 'followingIDs'
  | 'id'
  | 'likePostIDs'
  | 'name'
  | 'password'
  | 'roles';

export type UserScalarWhereInput = {
  readonly AND?: InputMaybe<ReadonlyArray<UserScalarWhereInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<UserScalarWhereInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<UserScalarWhereInput>>;
  readonly email?: InputMaybe<StringFilter>;
  readonly followerIDs?: InputMaybe<StringNullableListFilter>;
  readonly followingIDs?: InputMaybe<StringNullableListFilter>;
  readonly id?: InputMaybe<StringFilter>;
  readonly likePostIDs?: InputMaybe<StringNullableListFilter>;
  readonly name?: InputMaybe<StringNullableFilter>;
  readonly password?: InputMaybe<StringNullableFilter>;
  readonly roles?: InputMaybe<StringNullableListFilter>;
};

export type UserScalarWhereWithAggregatesInput = {
  readonly AND?: InputMaybe<ReadonlyArray<UserScalarWhereWithAggregatesInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<UserScalarWhereWithAggregatesInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<UserScalarWhereWithAggregatesInput>>;
  readonly email?: InputMaybe<StringWithAggregatesFilter>;
  readonly followerIDs?: InputMaybe<StringNullableListFilter>;
  readonly followingIDs?: InputMaybe<StringNullableListFilter>;
  readonly id?: InputMaybe<StringWithAggregatesFilter>;
  readonly likePostIDs?: InputMaybe<StringNullableListFilter>;
  readonly name?: InputMaybe<StringNullableWithAggregatesFilter>;
  readonly password?: InputMaybe<StringNullableWithAggregatesFilter>;
  readonly roles?: InputMaybe<StringNullableListFilter>;
};

export type UserUpdateInput = {
  readonly comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  readonly email?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  readonly following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  readonly followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  readonly likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  readonly name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  readonly roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateManyMutationInput = {
  readonly email?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  readonly followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  readonly likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  readonly name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateManyWithWhereWithoutFollowersInput = {
  readonly data: UserUpdateManyMutationInput;
  readonly where: UserScalarWhereInput;
};

export type UserUpdateManyWithWhereWithoutFollowingInput = {
  readonly data: UserUpdateManyMutationInput;
  readonly where: UserScalarWhereInput;
};

export type UserUpdateManyWithWhereWithoutLikePostsInput = {
  readonly data: UserUpdateManyMutationInput;
  readonly where: UserScalarWhereInput;
};

export type UserUpdateManyWithoutFollowersNestedInput = {
  readonly connect?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<UserCreateOrConnectWithoutFollowersInput>>;
  readonly create?: InputMaybe<ReadonlyArray<UserCreateWithoutFollowersInput>>;
  readonly delete?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly deleteMany?: InputMaybe<ReadonlyArray<UserScalarWhereInput>>;
  readonly disconnect?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly set?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly update?: InputMaybe<ReadonlyArray<UserUpdateWithWhereUniqueWithoutFollowersInput>>;
  readonly updateMany?: InputMaybe<ReadonlyArray<UserUpdateManyWithWhereWithoutFollowersInput>>;
  readonly upsert?: InputMaybe<ReadonlyArray<UserUpsertWithWhereUniqueWithoutFollowersInput>>;
};

export type UserUpdateManyWithoutFollowingNestedInput = {
  readonly connect?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<UserCreateOrConnectWithoutFollowingInput>>;
  readonly create?: InputMaybe<ReadonlyArray<UserCreateWithoutFollowingInput>>;
  readonly delete?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly deleteMany?: InputMaybe<ReadonlyArray<UserScalarWhereInput>>;
  readonly disconnect?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly set?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly update?: InputMaybe<ReadonlyArray<UserUpdateWithWhereUniqueWithoutFollowingInput>>;
  readonly updateMany?: InputMaybe<ReadonlyArray<UserUpdateManyWithWhereWithoutFollowingInput>>;
  readonly upsert?: InputMaybe<ReadonlyArray<UserUpsertWithWhereUniqueWithoutFollowingInput>>;
};

export type UserUpdateManyWithoutLikePostsNestedInput = {
  readonly connect?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly connectOrCreate?: InputMaybe<ReadonlyArray<UserCreateOrConnectWithoutLikePostsInput>>;
  readonly create?: InputMaybe<ReadonlyArray<UserCreateWithoutLikePostsInput>>;
  readonly delete?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly deleteMany?: InputMaybe<ReadonlyArray<UserScalarWhereInput>>;
  readonly disconnect?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly set?: InputMaybe<ReadonlyArray<UserWhereUniqueInput>>;
  readonly update?: InputMaybe<ReadonlyArray<UserUpdateWithWhereUniqueWithoutLikePostsInput>>;
  readonly updateMany?: InputMaybe<ReadonlyArray<UserUpdateManyWithWhereWithoutLikePostsInput>>;
  readonly upsert?: InputMaybe<ReadonlyArray<UserUpsertWithWhereUniqueWithoutLikePostsInput>>;
};

export type UserUpdateOneRequiredWithoutCommentsNestedInput = {
  readonly connect?: InputMaybe<UserWhereUniqueInput>;
  readonly connectOrCreate?: InputMaybe<UserCreateOrConnectWithoutCommentsInput>;
  readonly create?: InputMaybe<UserCreateWithoutCommentsInput>;
  readonly update?: InputMaybe<UserUpdateWithoutCommentsInput>;
  readonly upsert?: InputMaybe<UserUpsertWithoutCommentsInput>;
};

export type UserUpdateOneRequiredWithoutPostsNestedInput = {
  readonly connect?: InputMaybe<UserWhereUniqueInput>;
  readonly connectOrCreate?: InputMaybe<UserCreateOrConnectWithoutPostsInput>;
  readonly create?: InputMaybe<UserCreateWithoutPostsInput>;
  readonly update?: InputMaybe<UserUpdateWithoutPostsInput>;
  readonly upsert?: InputMaybe<UserUpsertWithoutPostsInput>;
};

export type UserUpdateWithWhereUniqueWithoutFollowersInput = {
  readonly data: UserUpdateWithoutFollowersInput;
  readonly where: UserWhereUniqueInput;
};

export type UserUpdateWithWhereUniqueWithoutFollowingInput = {
  readonly data: UserUpdateWithoutFollowingInput;
  readonly where: UserWhereUniqueInput;
};

export type UserUpdateWithWhereUniqueWithoutLikePostsInput = {
  readonly data: UserUpdateWithoutLikePostsInput;
  readonly where: UserWhereUniqueInput;
};

export type UserUpdateWithoutCommentsInput = {
  readonly email?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  readonly following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  readonly followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  readonly likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  readonly name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  readonly roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateWithoutFollowersInput = {
  readonly comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  readonly email?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  readonly following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  readonly followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  readonly likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  readonly name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  readonly roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateWithoutFollowingInput = {
  readonly comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  readonly email?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  readonly followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  readonly likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  readonly name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  readonly roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateWithoutLikePostsInput = {
  readonly comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  readonly email?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  readonly following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  readonly followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  readonly likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  readonly name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly posts?: InputMaybe<PostUpdateManyWithoutAuthorNestedInput>;
  readonly roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdateWithoutPostsInput = {
  readonly comments?: InputMaybe<CommentUpdateManyWithoutAuthorNestedInput>;
  readonly email?: InputMaybe<StringFieldUpdateOperationsInput>;
  readonly followerIDs?: InputMaybe<UserUpdatefollowerIDsInput>;
  readonly followers?: InputMaybe<UserUpdateManyWithoutFollowingNestedInput>;
  readonly following?: InputMaybe<UserUpdateManyWithoutFollowersNestedInput>;
  readonly followingIDs?: InputMaybe<UserUpdatefollowingIDsInput>;
  readonly likePostIDs?: InputMaybe<UserUpdatelikePostIDsInput>;
  readonly likePosts?: InputMaybe<PostUpdateManyWithoutLikesNestedInput>;
  readonly name?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly password?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  readonly roles?: InputMaybe<UserUpdaterolesInput>;
};

export type UserUpdatefollowerIDsInput = {
  readonly push?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly set?: InputMaybe<ReadonlyArray<Scalars['String']>>;
};

export type UserUpdatefollowingIDsInput = {
  readonly push?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly set?: InputMaybe<ReadonlyArray<Scalars['String']>>;
};

export type UserUpdatelikePostIDsInput = {
  readonly push?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly set?: InputMaybe<ReadonlyArray<Scalars['String']>>;
};

export type UserUpdaterolesInput = {
  readonly push?: InputMaybe<ReadonlyArray<Scalars['String']>>;
  readonly set?: InputMaybe<ReadonlyArray<Scalars['String']>>;
};

export type UserUpsertWithWhereUniqueWithoutFollowersInput = {
  readonly create: UserCreateWithoutFollowersInput;
  readonly update: UserUpdateWithoutFollowersInput;
  readonly where: UserWhereUniqueInput;
};

export type UserUpsertWithWhereUniqueWithoutFollowingInput = {
  readonly create: UserCreateWithoutFollowingInput;
  readonly update: UserUpdateWithoutFollowingInput;
  readonly where: UserWhereUniqueInput;
};

export type UserUpsertWithWhereUniqueWithoutLikePostsInput = {
  readonly create: UserCreateWithoutLikePostsInput;
  readonly update: UserUpdateWithoutLikePostsInput;
  readonly where: UserWhereUniqueInput;
};

export type UserUpsertWithoutCommentsInput = {
  readonly create: UserCreateWithoutCommentsInput;
  readonly update: UserUpdateWithoutCommentsInput;
};

export type UserUpsertWithoutPostsInput = {
  readonly create: UserCreateWithoutPostsInput;
  readonly update: UserUpdateWithoutPostsInput;
};

export type UserWhereInput = {
  readonly AND?: InputMaybe<ReadonlyArray<UserWhereInput>>;
  readonly NOT?: InputMaybe<ReadonlyArray<UserWhereInput>>;
  readonly OR?: InputMaybe<ReadonlyArray<UserWhereInput>>;
  readonly comments?: InputMaybe<CommentListRelationFilter>;
  readonly email?: InputMaybe<StringFilter>;
  readonly followerIDs?: InputMaybe<StringNullableListFilter>;
  readonly followers?: InputMaybe<UserListRelationFilter>;
  readonly following?: InputMaybe<UserListRelationFilter>;
  readonly followingIDs?: InputMaybe<StringNullableListFilter>;
  readonly id?: InputMaybe<StringFilter>;
  readonly likePostIDs?: InputMaybe<StringNullableListFilter>;
  readonly likePosts?: InputMaybe<PostListRelationFilter>;
  readonly name?: InputMaybe<StringNullableFilter>;
  readonly password?: InputMaybe<StringNullableFilter>;
  readonly posts?: InputMaybe<PostListRelationFilter>;
  readonly roles?: InputMaybe<StringNullableListFilter>;
};

export type UserWhereUniqueInput = {
  readonly email?: InputMaybe<Scalars['String']>;
  readonly id?: InputMaybe<Scalars['String']>;
};

export interface TSGQLDocuments extends Record<string, import('@ts-gql/tag').TypedDocumentNode<import('@ts-gql/tag').BaseDocumentTypes>> {}

export type TSGQLRequiredFragments<T> = (providedFragments: T) => T;