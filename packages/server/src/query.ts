import {GraphQLOutputType, GraphQLScalarType, GraphQLString, GraphQLScalarTypeConfig, GraphQLBoolean, GraphQLInt} from 'graphql'

export interface FieldOptions {
  name: string

}

export interface ScalarAtom<TType> {
  raw: GraphQLScalarType
}

export const StringScalar: ScalarAtom<string> = {
  raw: GraphQLString,
}

export const NumberScalar: ScalarAtom<number> = {
  raw: GraphQLInt,
}

export const BooleanScalar: ScalarAtom<boolean> = {
  raw: GraphQLBoolean,
}

export interface ArgAtom<TType> {
  description?: string
  type: ScalarAtom<TType>
}

export type Args = { [argName: string]: ArgAtom<any> }

export type ResolveFunction<TArgs extends Args, TReturn> = (args: TArgs) => TReturn

export interface ResolveAtom<TArgs extends Args, TReturn> {
  type: ScalarAtom<TReturn>
  args?: TArgs
  resolve?: ResolveFunction<TArgs, TReturn>
}

export function defineScalar <TInternal, TExternal>(options: GraphQLScalarTypeConfig<TInternal, TExternal>): ScalarAtom<TExternal> {
  return {
    raw: new GraphQLScalarType(options),
  }
}

export function defineArg <TArg>(type: ScalarAtom<TArg>, options?: Pick<ArgAtom<TArg>, 'description'>): ArgAtom<TArg> {
  return {
    ...options,
    type,
  }
}

export function defineField <TArgs extends Args, TReturn>(type: ScalarAtom<TReturn>, resolve?: ResolveFunction<TArgs, TReturn>, args?: TArgs) {
  return {
    args,
    type,
    resolve,
  }
}
