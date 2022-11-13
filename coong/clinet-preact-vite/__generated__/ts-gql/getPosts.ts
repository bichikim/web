// ts-gql-integrity:fc5c31dee6e7f09aa1dea61074df959e
/*
ts-gql-meta-begin
{
  "hash": "d14adf26b4968a33319f6840ed8aec94"
}
ts-gql-meta-end
*/

import * as SchemaTypes from './@schema'
import {TypedDocumentNode} from "@ts-gql/tag"

type getPostsQueryVariables = SchemaTypes.Exact<{
  cursor?: SchemaTypes.InputMaybe<SchemaTypes.PostWhereUniqueInput>;
  take?: SchemaTypes.InputMaybe<SchemaTypes.Scalars['Int']>;
  orderBy?: SchemaTypes.InputMaybe<ReadonlyArray<SchemaTypes.PostOrderByWithRelationInput> | SchemaTypes.PostOrderByWithRelationInput>;
  skip?: SchemaTypes.InputMaybe<SchemaTypes.Scalars['Int']>;
}>

type getPostsQuery = { readonly __typename: 'Query'; readonly posts: ReadonlyArray<{ readonly __typename: 'Post'; readonly id: string; readonly message: string | null, readonly title: string }> };
}

export type type = TypedDocumentNode<{
  documents: SchemaTypes.TSGQLDocuments;
  result: getPostsQuery;
  variables: getPostsQueryVariables;
  type: "query";
  fragments: SchemaTypes.TSGQLRequiredFragments<'none'>
}>

declare module './@schema' {
  interface TSGQLDocuments {
    getPosts: type
  }
}

export const document = JSON.parse(
  '{"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skip"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"directives":[]},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"take"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"directives":[]},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderBy"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PostOrderByWithRelationInput"}}}},"directives":[]},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PostWhereUniqueInput"}},"directives":[]}],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"posts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skip"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skip"}}},{"kind":"Argument","name":{"kind":"Name","value":"take"},"value":{"kind":"Variable","name":{"kind":"Name","value":"take"}}},{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"title"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"message"},"arguments":[],"directives":[]}]}}]}}]}',
)
