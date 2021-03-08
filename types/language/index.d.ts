// language Global types

type PickRequired<Record, Keys extends keyof Record> = {
  [Props in Keys]-?: Record[Props]
} & {
  [Props in Exclude<keyof Record, Keys>]: Record[Props]
}

type AnyObject<Value = any, Key extends number | string | symbol = number | string | symbol> = Record<Key, Value>

type EmptyObject = {
  // empty
}

type PureObject<Value = any> = AnyObject<Value, string>

type MayArray<Value> = Value | Value[]

type AnyFunction<Args extends any[] = any[], Return = any> = (...args: Args) => Return

type DropTuple<Tuple extends any[]> = Tuple extends [any, ...infer Rest] ? Rest : any[]

type DropParameters<Func extends (...args: any) => any> = DropTuple<Parameters<Func>>

type DropRightTuple<Tuple extends any[]> = Tuple extends [...infer Head, any] ? Head : any[]

type DropRightParameters<Func extends (...args: any) => any> = DropRightTuple<Parameters<Func>>

type GetLength<Original extends any[]> = Original extends { length: infer Length } ? Length : never
