// ts-gql-integrity:bb8b857a8175889925d09e7020442d34
/*
ts-gql-meta-begin
{
  "hash": "bd7e0c79abd4b53e494165c8bbbd0641"
}
ts-gql-meta-end
*/

import * as SchemaTypes from "./@schema";
import { TypedDocumentNode } from "@ts-gql/tag";

type getPostsQueryVariables = SchemaTypes.Exact<{
  skip?: SchemaTypes.InputMaybe<SchemaTypes.Scalars['Int']>;
  take?: SchemaTypes.InputMaybe<SchemaTypes.Scalars['Int']>;
  orderBy?: SchemaTypes.InputMaybe<ReadonlyArray<SchemaTypes.PostOrderByWithRelationInput> | SchemaTypes.PostOrderByWithRelationInput>;
  cursor?: SchemaTypes.InputMaybe<SchemaTypes.PostWhereUniqueInput>;
}>;


type getPostsQuery = { readonly __typename: 'Query', readonly posts: ReadonlyArray<{ readonly __typename: 'Post', readonly id: string, readonly title: string, readonly message: string | null }> };


      
export type type = TypedDocumentNode<{
  type: "query";
  result: getPostsQuery;
  variables: getPostsQueryVariables;
  documents: SchemaTypes.TSGQLDocuments;
  fragments: SchemaTypes.TSGQLRequiredFragments<"none">
}>

declare module "./@schema" {
  interface TSGQLDocuments {
    getPosts: type;
  }
}

export const document = JSON.parse("{\"kind\":\"Document\",\"definitions\":[{\"kind\":\"OperationDefinition\",\"operation\":\"query\",\"name\":{\"kind\":\"Name\",\"value\":\"getPosts\"},\"variableDefinitions\":[{\"kind\":\"VariableDefinition\",\"variable\":{\"kind\":\"Variable\",\"name\":{\"kind\":\"Name\",\"value\":\"skip\"}},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"VariableDefinition\",\"variable\":{\"kind\":\"Variable\",\"name\":{\"kind\":\"Name\",\"value\":\"take\"}},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"VariableDefinition\",\"variable\":{\"kind\":\"Variable\",\"name\":{\"kind\":\"Name\",\"value\":\"orderBy\"}},\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"PostOrderByWithRelationInput\"}}}},\"directives\":[]},{\"kind\":\"VariableDefinition\",\"variable\":{\"kind\":\"Variable\",\"name\":{\"kind\":\"Name\",\"value\":\"cursor\"}},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"PostWhereUniqueInput\"}},\"directives\":[]}],\"directives\":[],\"selectionSet\":{\"kind\":\"SelectionSet\",\"selections\":[{\"kind\":\"Field\",\"name\":{\"kind\":\"Name\",\"value\":\"posts\"},\"arguments\":[{\"kind\":\"Argument\",\"name\":{\"kind\":\"Name\",\"value\":\"skip\"},\"value\":{\"kind\":\"Variable\",\"name\":{\"kind\":\"Name\",\"value\":\"skip\"}}},{\"kind\":\"Argument\",\"name\":{\"kind\":\"Name\",\"value\":\"take\"},\"value\":{\"kind\":\"Variable\",\"name\":{\"kind\":\"Name\",\"value\":\"take\"}}},{\"kind\":\"Argument\",\"name\":{\"kind\":\"Name\",\"value\":\"orderBy\"},\"value\":{\"kind\":\"Variable\",\"name\":{\"kind\":\"Name\",\"value\":\"orderBy\"}}},{\"kind\":\"Argument\",\"name\":{\"kind\":\"Name\",\"value\":\"cursor\"},\"value\":{\"kind\":\"Variable\",\"name\":{\"kind\":\"Name\",\"value\":\"cursor\"}}}],\"directives\":[],\"selectionSet\":{\"kind\":\"SelectionSet\",\"selections\":[{\"kind\":\"Field\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"directives\":[]},{\"kind\":\"Field\",\"name\":{\"kind\":\"Name\",\"value\":\"title\"},\"arguments\":[],\"directives\":[]},{\"kind\":\"Field\",\"name\":{\"kind\":\"Name\",\"value\":\"message\"},\"arguments\":[],\"directives\":[]}]}}]}}]}")
