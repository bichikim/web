// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmptyObject {
  // empty
}

export type ObjectKey = string | symbol | number

export type AnyObject<Value = any> = Record<ObjectKey, Value>
