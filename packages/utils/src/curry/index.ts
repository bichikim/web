interface CurriedFunction0<R> {
  (): R
}

interface CurriedFunction1<T1, R> {
  (t2: T1): R
}

interface CurriedFunction1And1<T1, R> {
  (t2?: T1): R
}

interface CurriedFunction2<T1, T2, R> {
  (t1: T1): CurriedFunction1<T2, R>

  (t1: T1, t2: T2): R
}

interface CurriedFunction2And1<T1, T2, R> {
  (t1: T1): CurriedFunction1And1<T2, R>

  (t1: T1, t2?: T2): R
}

interface CurriedFunction2And2<T1, T2, R> {
  (t1?: T1): CurriedFunction1And1<T2, R>

  (t1?: T1, t2?: T2): R
}

interface CurriedFunction3<T1, T2, T3, R> {
  (t1: T1): CurriedFunction2<T2, T3, R>

  (t1: T1, t2: T2): CurriedFunction1<T3, R>

  (t1: T1, t2: T2, t3: T3): R
}

interface CurriedFunction3And1<T1, T2, T3, R> {
  (t1: T1): CurriedFunction2And1<T2, T3, R>

  (t1: T1, t2: T2): CurriedFunction1And1<T3, R>

  (t1: T1, t2: T2, t3?: T3): R
}

interface CurriedFunction3And2<T1, T2, T3, R> {
  (t1: T1): CurriedFunction2And2<T2, T3, R>

  (t1: T1, t2?: T2): CurriedFunction1And1<T3, R>

  (t1: T1, t2?: T2, t3?: T3): R
}

interface CurriedFunction3And3<T1, T2, T3, R> {
  (t1?: T1): CurriedFunction2And2<T2, T3, R>

  (t1?: T1, t2?: T2): CurriedFunction1And1<T3, R>

  (t1?: T1, t2?: T2, t3?: T3): R
}

interface CurriedFunction4<T1, T2, T3, T4, R> {
  (t1: T1): CurriedFunction3<T2, T3, T4, R>

  (t1: T1, t2: T2): CurriedFunction2<T3, T4, R>

  (t1: T1, t2: T2, t3: T3): CurriedFunction1<T4, R>

  (t1: T1, t2: T2, t3: T3, t4: T4): R
}

interface CurriedFunction4And1<T1, T2, T3, T4, R> {
  (t1: T1): CurriedFunction3And1<T2, T3, T4, R>

  (t1: T1, t2: T2): CurriedFunction2And1<T3, T4, R>

  (t1: T1, t2: T2, t3: T3): CurriedFunction1And1<T4, R>

  (t1: T1, t2: T2, t3: T3, t4?: T4): R
}

interface CurriedFunction4And2<T1, T2, T3, T4, R> {
  (t1: T1): CurriedFunction3And2<T2, T3, T4, R>

  (t1: T1, t2: T2): CurriedFunction2And2<T3, T4, R>

  (t1: T1, t2: T2, t3?: T3): CurriedFunction1And1<T4, R>

  (t1: T1, t2: T2, t3?: T3, t4?: T4): R
}

interface CurriedFunction4And3<T1, T2, T3, T4, R> {
  (t1: T1): CurriedFunction3And3<T2, T3, T4, R>

  (t1: T1, t2?: T2): CurriedFunction2And2<T3, T4, R>

  (t1: T1, t2?: T2, t3?: T3): CurriedFunction1And1<T4, R>

  (t1: T1, t2?: T2, t3?: T3, t4?: T4): R
}

interface CurriedFunction4And4<T1, T2, T3, T4, R> {
  (t1?: T1): CurriedFunction3And3<T2, T3, T4, R>

  (t1?: T1, t2?: T2): CurriedFunction2And2<T3, T4, R>

  (t1?: T1, t2?: T2, t3?: T3): CurriedFunction1And1<T4, R>

  (t1?: T1, t2?: T2, t3?: T3, t4?: T4): R
}

type Length<T extends readonly any[]> = T['length']

export function curry<T extends readonly any[], R>(
  f: (...args: T) => R,
  length?: number,
  args?: unknown[],
): Length<T> extends 0
  ? CurriedFunction0<R>
  : Length<T> extends 1
    ? CurriedFunction1<T[0], R>
    : Length<T> extends 0 | 1
      ? CurriedFunction1And1<T[0], R>
      : Length<T> extends 2
        ? CurriedFunction2<T[0], T[1], R>
        : Length<T> extends 2 | 1
          ? CurriedFunction2And1<T[0], T[1], R>
          : Length<T> extends 2 | 1 | 0
            ? CurriedFunction2And2<T[0], T[1], R>
            : Length<T> extends 3
              ? CurriedFunction3<T[0], T[1], T[2], R>
              : Length<T> extends 3 | 2
                ? CurriedFunction3And1<T[0], T[1], T[2], R>
                : Length<T> extends 3 | 2 | 1
                  ? CurriedFunction3And2<T[0], T[1], T[2], R>
                  : Length<T> extends 3 | 2 | 1 | 0
                    ? CurriedFunction3And3<T[0], T[1], T[2], R>
                    : Length<T> extends 4
                      ? CurriedFunction4<T[0], T[1], T[2], T[3], R>
                      : Length<T> extends 4 | 3
                        ? CurriedFunction4And1<T[0], T[1], T[2], T[3], R>
                        : Length<T> extends 4 | 3 | 2
                          ? CurriedFunction4And2<T[0], T[1], T[2], T[3], R>
                          : Length<T> extends 4 | 3 | 2 | 1
                            ? CurriedFunction4And3<T[0], T[1], T[2], T[3], R>
                            : Length<T> extends 4 | 3 | 2 | 1 | 0
                              ? CurriedFunction4And4<T[0], T[1], T[2], T[3], R>
                              : never

// export function curry<T1, R>(f: (t1?: T1) => R, length?: number, args?: unknown[]): CurriedFunction1And1<T1, R>
// export function curry<T1, R>(f: (t1: T1) => R, length?: number, args?: unknown[]): CurriedFunction1<T1, R>
// export function curry<T1, T2, R>(
//   f: (t1?: T1, t2?: T2) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction2And2<T1, T2, R>
// export function curry<T1, T2, R>(
//   f: (t1: T1, t2?: T2) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction2And1<T1, T2, R>
// export function curry<T1, T2, R>(
//   f: (t1: T1, t2: T2) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction2<T1, T2, R>
// export function curry<T1, T2, T3, R>(
//   f: (t1?: T1, t2?: T2, t3?: T3) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction3And3<T1, T2, T3, R>
// export function curry<T1, T2, T3, R>(
//   f: (t1: T1, t2?: T2, t3?: T3) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction3And2<T1, T2, T3, R>
// export function curry<T1, T2, T3, R>(
//   f: (t1: T1, t2: T2, t3?: T3) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction3And1<T1, T2, T3, R>
// export function curry<T1, T2, T3, R>(
//   f: (t1: T1, t2: T2, t3: T3) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction3<T1, T2, T3, R>
// export function curry<T1, T2, T3, T4, R>(
//   f: (t1?: T1, t2?: T2, t3?: T3, t4?: T4) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction4And4<T1, T2, T3, T4, R>
// export function curry<T1, T2, T3, T4, R>(
//   f: (t1: T1, t2?: T2, t3?: T3, t4?: T4) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction4And3<T1, T2, T3, T4, R>
// export function curry<T1, T2, T3, T4, R>(
//   f: (t1: T1, t2: T2, t3?: T3, t4?: T4) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction4And2<T1, T2, T3, T4, R>
// export function curry<T1, T2, T3, T4, R>(
//   f: (t1: T1, t2: T2, t3: T3, t4?: T4) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction4And1<T1, T2, T3, T4, R>
// export function curry<T1, T2, T3, T4, R>(
//   f: (t1: T1, t2: T2, t3: T3, t4: T4) => R,
//   length?: number,
//   args?: unknown[],
// ): CurriedFunction4<T1, T2, T3, T4, R>

export function curry(target: (...args: unknown[]) => unknown, length: number = target.length, args: unknown[] = []) {
  const _args: unknown[] = args

  return (...args: unknown[]) => {
    const nextArgs = [..._args, ...args]

    if (nextArgs.length >= length) {
      return target(...nextArgs)
    }

    return curry(target, length, nextArgs)
  }
}

export type ObjectInfer<T> = T extends {[key: string]: infer U} ? {[P in keyof T]: T[P]} : T

export interface CurriedFunction2T1R<F extends (arg1: any, arg2: any) => any> {
  (t1: Parameters<F>[0]): ReturnType<F>
}
export interface CurriedFunction1R<F extends (arg1: any) => any> {
  <T1 extends Parameters<F>[0]>(t1: T1): ReturnType<F>
}
export interface CurriedFunction2R<F extends (arg1: any, arg2: any) => any> {
  <T1 extends Parameters<F>[1]>(t1: T1): CurriedFunction2T1R<F>

  <T1 extends Parameters<F>[1], T2 extends Parameters<F>[0]>(t1: T1, t2: T2): ReturnType<F>
}

export interface CurriedFunction3R<F extends (arg1: any, arg2: any, arg3: any) => any> {
  <T1 extends Parameters<F>[2]>(
    t1: T1,
  ): CurriedFunction2R<(arg1: Parameters<F>[0], arg2: Parameters<F>[1]) => ReturnType<F>>

  <T1 extends Parameters<F>[2], T2 extends Parameters<F>[1]>(
    t1: T1,
    t2: T2,
  ): CurriedFunction1R<(arg1: Parameters<F>[0]) => ReturnType<F>>

  <T1 extends Parameters<F>[2], T2 extends Parameters<F>[1], T3 extends Parameters<F>[0]>(
    t1: T1,
    t2: T2,
    t3: T3,
  ): ReturnType<F>
}

export interface CurriedFunction4R<F extends (arg1: any, arg2: any, arg3: any, arg4: any) => any> {
  <T1 extends Parameters<F>[3]>(
    t1: T1,
  ): CurriedFunction3R<(arg1: Parameters<F>[0], arg2: Parameters<F>[1], arg3: Parameters<F>[2]) => ReturnType<F>>

  <T1 extends Parameters<F>[3], T2 extends Parameters<F>[2]>(
    t1: T1,
    t2: T2,
  ): CurriedFunction2R<(arg1: Parameters<F>[0], arg2: Parameters<F>[1]) => ReturnType<F>>

  <T1 extends Parameters<F>[3], T2 extends Parameters<F>[2], T3 extends Parameters<F>[1]>(
    t1: T1,
    t2: T2,
    t3: T3,
  ): CurriedFunction1R<(arg1: Parameters<F>[0]) => ReturnType<F>>

  <T1 extends Parameters<F>[3], T2 extends Parameters<F>[2], T3 extends Parameters<F>[1], T4 extends Parameters<F>[0]>(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
  ): ReturnType<F>
}

export interface CurriedFunction5R<F extends (arg1: any, arg2: any, arg3: any, arg4: any, arg5: any) => any> {
  <T1 extends Parameters<F>[4]>(
    t1: T1,
  ): CurriedFunction4R<
    (arg1: Parameters<F>[0], arg2: Parameters<F>[1], arg3: Parameters<F>[2], arg4: Parameters<F>[3]) => ReturnType<F>
  >

  <T1 extends Parameters<F>[4], T2 extends Parameters<F>[3]>(
    t1: T1,
    t2: T2,
  ): CurriedFunction3R<(arg1: Parameters<F>[0], arg2: Parameters<F>[1], arg3: Parameters<F>[2]) => ReturnType<F>>

  <T1 extends Parameters<F>[4], T2 extends Parameters<F>[3], T3 extends Parameters<F>[2]>(
    t1: T1,
    t2: T2,
    t3: T3,
  ): CurriedFunction2R<(arg1: Parameters<F>[0], arg2: Parameters<F>[1]) => ReturnType<F>>

  <T1 extends Parameters<F>[4], T2 extends Parameters<F>[3], T3 extends Parameters<F>[2], T4 extends Parameters<F>[1]>(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
  ): CurriedFunction1R<(arg1: Parameters<F>[0]) => ReturnType<F>>

  <
    T1 extends Parameters<F>[4],
    T2 extends Parameters<F>[3],
    T3 extends Parameters<F>[2],
    T4 extends Parameters<F>[1],
    T5 extends Parameters<F>[0],
  >(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
    t5: T5,
  ): ReturnType<F>
}

export interface CurriedFunction6R<
  F extends (arg1: any, arg2: any, arg3: any, arg4: any, arg5: any, arg6: any) => any,
> {
  <T1 extends Parameters<F>[5]>(
    t1: T1,
  ): CurriedFunction5R<
    (
      arg1: Parameters<F>[0],
      arg2: Parameters<F>[1],
      arg3: Parameters<F>[2],
      arg4: Parameters<F>[3],
      arg5: Parameters<F>[4],
    ) => ReturnType<F>
  >

  <T1 extends Parameters<F>[5], T2 extends Parameters<F>[4]>(
    t1: T1,
    t2: T2,
  ): CurriedFunction4R<
    (arg1: Parameters<F>[0], arg2: Parameters<F>[1], arg3: Parameters<F>[2], arg4: Parameters<F>[3]) => ReturnType<F>
  >

  <T1 extends Parameters<F>[5], T2 extends Parameters<F>[4], T3 extends Parameters<F>[3]>(
    t1: T1,
    t2: T2,
    t3: T3,
  ): CurriedFunction3R<(arg1: Parameters<F>[0], arg2: Parameters<F>[1], arg3: Parameters<F>[2]) => ReturnType<F>>

  <T1 extends Parameters<F>[5], T2 extends Parameters<F>[4], T3 extends Parameters<F>[3], T4 extends Parameters<F>[2]>(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
  ): CurriedFunction2R<(arg1: Parameters<F>[0], arg2: Parameters<F>[1]) => ReturnType<F>>

  <
    T1 extends Parameters<F>[5],
    T2 extends Parameters<F>[4],
    T3 extends Parameters<F>[3],
    T4 extends Parameters<F>[2],
    T5 extends Parameters<F>[1],
  >(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
    t5: T5,
  ): CurriedFunction1R<(arg1: Parameters<F>[0]) => ReturnType<F>>

  <
    T1 extends Parameters<F>[5],
    T2 extends Parameters<F>[4],
    T3 extends Parameters<F>[3],
    T4 extends Parameters<F>[2],
    T5 extends Parameters<F>[1],
    T6 extends Parameters<F>[0],
  >(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
    t5: T5,
    t6: T6,
  ): ReturnType<F>
}

export interface CurriedFunction7R<
  F extends (arg1: any, arg2: any, arg3: any, arg4: any, arg5: any, arg6: any, arg7: any) => any,
> {
  <T1 extends Parameters<F>[6]>(
    t1: T1,
  ): CurriedFunction6R<
    (
      arg1: Parameters<F>[0],
      arg2: Parameters<F>[1],
      arg3: Parameters<F>[2],
      arg4: Parameters<F>[3],
      arg5: Parameters<F>[4],
      arg6: Parameters<F>[5],
    ) => ReturnType<F>
  >

  <T1 extends Parameters<F>[6], T2 extends Parameters<F>[5]>(
    t1: T1,
    t2: T2,
  ): CurriedFunction5R<
    (
      arg1: Parameters<F>[0],
      arg2: Parameters<F>[1],
      arg3: Parameters<F>[2],
      arg4: Parameters<F>[3],
      arg5: Parameters<F>[4],
    ) => ReturnType<F>
  >

  <T1 extends Parameters<F>[6], T2 extends Parameters<F>[5], T3 extends Parameters<F>[4]>(
    t1: T1,
    t2: T2,
    t3: T3,
  ): CurriedFunction4R<
    (arg1: Parameters<F>[3], arg2: Parameters<F>[2], arg3: Parameters<F>[1], arg4: Parameters<F>[0]) => ReturnType<F>
  >

  <T1 extends Parameters<F>[6], T2 extends Parameters<F>[5], T3 extends Parameters<F>[4], T4 extends Parameters<F>[3]>(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
  ): CurriedFunction3R<(arg1: Parameters<F>[0], arg2: Parameters<F>[1], arg3: Parameters<F>[2]) => ReturnType<F>>

  <
    T1 extends Parameters<F>[6],
    T2 extends Parameters<F>[5],
    T3 extends Parameters<F>[4],
    T4 extends Parameters<F>[3],
    T5 extends Parameters<F>[2],
  >(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
    t5: T5,
  ): CurriedFunction2R<(arg1: Parameters<F>[0], arg2: Parameters<F>[1]) => ReturnType<F>>

  <
    T1 extends Parameters<F>[6],
    T2 extends Parameters<F>[5],
    T3 extends Parameters<F>[4],
    T4 extends Parameters<F>[3],
    T5 extends Parameters<F>[2],
    T6 extends Parameters<F>[1],
  >(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
    t5: T5,
    t6: T6,
  ): CurriedFunction1R<(arg1: Parameters<F>[0]) => ReturnType<F>>

  <
    T1 extends Parameters<F>[6],
    T2 extends Parameters<F>[5],
    T3 extends Parameters<F>[4],
    T4 extends Parameters<F>[3],
    T5 extends Parameters<F>[2],
    T6 extends Parameters<F>[1],
    T7 extends Parameters<F>[0],
  >(
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
    t5: T5,
    t6: T6,
    t7: T7,
  ): ReturnType<F>
}

export type CurryReverse<F extends (...args: any[]) => any> = F extends (arg1: any) => any
  ? CurriedFunction1R<F>
  : F extends (arg1: any, arg2: any) => any
    ? CurriedFunction2R<F>
    : F extends (arg1: any, arg2: any, arg3: any) => any
      ? CurriedFunction3R<F>
      : F extends (arg1: any, arg2: any, arg3: any, arg4: any) => any
        ? CurriedFunction4R<F>
        : F extends (arg1: any, arg2: any, arg3: any, arg4: any, arg5: any) => any
          ? CurriedFunction5R<F>
          : F extends (arg1: any, arg2: any, arg3: any, arg4: any, arg5: any, arg6: any) => any
            ? CurriedFunction6R<F>
            : F extends (arg1: any, arg2: any, arg3: any, arg4: any, arg5: any, arg6: any, arg7: any) => any
              ? CurriedFunction7R<F>
              : any

export function curryReverse<F extends (...args: any[]) => any>(
  target: F,
  length: number = target.length,
  args: unknown[] = [],
): CurryReverse<F> {
  const _args: unknown[] = args

  return ((...args: unknown[]) => {
    const nextArgs = [...args.reverse(), ..._args]

    if (nextArgs.length >= length) {
      return target(...nextArgs)
    }

    return curryReverse(target, length, nextArgs)
  }) as any
}
