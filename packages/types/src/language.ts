// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmptyObject {
  // empty
}

export type AnyObject = Record<string | symbol | number, any>

export type PureObject = Record<string, any>
