// oxlint-disable id-length
// oxlint-disable no-magic-numbers
// oxlint-disable max-params

/* AI_NOTE - CurriedFunction{N}[Opt{K}]: N = original arity; T0..T(n-1) = Parameters order; OptK = K trailing optionals; R suffix = reverse curry (right-to-left). */

type Length<T extends readonly any[]> = T['length']

type RuntimeRequiredTuple<T extends readonly any[]> = {
  [K in keyof T as K]-?: undefined extends T[K] ? T[K] | undefined : T[K]
}

export type ObjectInfer<T> = T extends {[key: string]: any} ? {[P in keyof T]: T[P]} : T

export interface CurriedFunction0<R> {
  (): R
}

export interface CurriedFunction1<T0, R> {
  (t1: T0): R
}

export interface CurriedFunction1Opt1<T0, R> {
  (t1?: T0): R
}

export interface CurriedFunction2<T0, T1, R> {
  (t1: T0): CurriedFunction1<T1, R>

  (t1: T0, t2: T1): R
}

export interface CurriedFunction2Opt1<T0, T1, R> {
  (t1: T0): CurriedFunction1Opt1<T1, R>

  (t1: T0, t2?: T1): R
}

export interface CurriedFunction2Opt2<T0, T1, R> {
  (t1?: T0): CurriedFunction1Opt1<T1, R>

  (t1?: T0, t2?: T1): R
}

export interface CurriedFunction3<T0, T1, T2, R> {
  (t1: T0): CurriedFunction2<T1, T2, R>

  (t1: T0, t2: T1): CurriedFunction1<T2, R>

  (t1: T0, t2: T1, t3: T2): R
}

export interface CurriedFunction3Opt1<T0, T1, T2, R> {
  (t1: T0): CurriedFunction2Opt1<T1, T2, R>

  (t1: T0, t2: T1): CurriedFunction1Opt1<T2, R>

  (t1: T0, t2: T1, t3?: T2): R
}

export interface CurriedFunction3Opt2<T0, T1, T2, R> {
  (t1: T0): CurriedFunction2Opt2<T1, T2, R>

  (t1: T0, t2?: T1): CurriedFunction1Opt1<T2, R>

  (t1: T0, t2?: T1, t3?: T2): R
}

export interface CurriedFunction3Opt3<T0, T1, T2, R> {
  (t1?: T0): CurriedFunction2Opt2<T1, T2, R>

  (t1?: T0, t2?: T1): CurriedFunction1Opt1<T2, R>

  (t1?: T0, t2?: T1, t3?: T2): R
}

export interface CurriedFunction4<T0, T1, T2, T3, R> {
  (t1: T0): CurriedFunction3<T1, T2, T3, R>

  (t1: T0, t2: T1): CurriedFunction2<T2, T3, R>

  (t1: T0, t2: T1, t3: T2): CurriedFunction1<T3, R>

  (t1: T0, t2: T1, t3: T2, t4: T3): R
}

export interface CurriedFunction4Opt1<T0, T1, T2, T3, R> {
  (t1: T0): CurriedFunction3Opt1<T1, T2, T3, R>

  (t1: T0, t2: T1): CurriedFunction2Opt1<T2, T3, R>

  (t1: T0, t2: T1, t3: T2): CurriedFunction1Opt1<T3, R>

  (t1: T0, t2: T1, t3: T2, t4?: T3): R
}

export interface CurriedFunction4Opt2<T0, T1, T2, T3, R> {
  (t1: T0): CurriedFunction3Opt2<T1, T2, T3, R>

  (t1: T0, t2: T1): CurriedFunction2Opt2<T2, T3, R>

  (t1: T0, t2: T1, t3?: T2): CurriedFunction1Opt1<T3, R>

  (t1: T0, t2: T1, t3?: T2, t4?: T3): R
}

export interface CurriedFunction4Opt3<T0, T1, T2, T3, R> {
  (t1: T0): CurriedFunction3Opt3<T1, T2, T3, R>

  (t1: T0, t2?: T1): CurriedFunction2Opt2<T2, T3, R>

  (t1: T0, t2?: T1, t3?: T2): CurriedFunction1Opt1<T3, R>

  (t1: T0, t2?: T1, t3?: T2, t4?: T3): R
}

export interface CurriedFunction4Opt4<T0, T1, T2, T3, R> {
  (t1?: T0): CurriedFunction3Opt3<T1, T2, T3, R>

  (t1?: T0, t2?: T1): CurriedFunction2Opt2<T2, T3, R>

  (t1?: T0, t2?: T1, t3?: T2): CurriedFunction1Opt1<T3, R>

  (t1?: T0, t2?: T1, t3?: T2, t4?: T3): R
}

export interface CurriedFunction2R<T0, T1, R> {
  <U extends T1>(t1: U): CurriedFunction1<T0, R>

  <U extends T1, V extends T0>(t1: U, t2: V): R
}

export interface CurriedFunction3R<T0, T1, T2, R> {
  <U extends T2>(t1: U): CurriedFunction2R<T0, T1, R>

  <U extends T2, V extends T1>(t1: U, t2: V): CurriedFunction1<T0, R>

  <U extends T2, V extends T1, W extends T0>(t1: U, t2: V, t3: W): R
}

export interface CurriedFunction4R<T0, T1, T2, T3, R> {
  <U extends T3>(t1: U): CurriedFunction3R<T0, T1, T2, R>

  <U extends T3, V extends T2>(t1: U, t2: V): CurriedFunction2R<T0, T1, R>

  <U extends T3, V extends T2, W extends T1>(t1: U, t2: V, t3: W): CurriedFunction1<T0, R>

  <U extends T3, V extends T2, W extends T1, X extends T0>(t1: U, t2: V, t3: W, t4: X): R
}

export interface CurriedFunction5R<T0, T1, T2, T3, T4, R> {
  <U extends T4>(t1: U): CurriedFunction4R<T0, T1, T2, T3, R>

  <U extends T4, V extends T3>(t1: U, t2: V): CurriedFunction3R<T0, T1, T2, R>

  <U extends T4, V extends T3, W extends T2>(t1: U, t2: V, t3: W): CurriedFunction2R<T0, T1, R>

  <U extends T4, V extends T3, W extends T2, X extends T1>(
    t1: U,
    t2: V,
    t3: W,
    t4: X,
  ): CurriedFunction1<T0, R>

  <U extends T4, V extends T3, W extends T2, X extends T1, Y extends T0>(
    t1: U,
    t2: V,
    t3: W,
    t4: X,
    t5: Y,
  ): R
}

export interface CurriedFunction6R<T0, T1, T2, T3, T4, T5, R> {
  <U extends T5>(t1: U): CurriedFunction5R<T0, T1, T2, T3, T4, R>

  <U extends T5, V extends T4>(t1: U, t2: V): CurriedFunction4R<T0, T1, T2, T3, R>

  <U extends T5, V extends T4, W extends T3>(t1: U, t2: V, t3: W): CurriedFunction3R<T0, T1, T2, R>

  <U extends T5, V extends T4, W extends T3, X extends T2>(
    t1: U,
    t2: V,
    t3: W,
    t4: X,
  ): CurriedFunction2R<T0, T1, R>

  <U extends T5, V extends T4, W extends T3, X extends T2, Y extends T1>(
    t1: U,
    t2: V,
    t3: W,
    t4: X,
    t5: Y,
  ): CurriedFunction1<T0, R>

  <U extends T5, V extends T4, W extends T3, X extends T2, Y extends T1, Z extends T0>(
    t1: U,
    t2: V,
    t3: W,
    t4: X,
    t5: Y,
    t6: Z,
  ): R
}

export interface CurriedFunction7R<T0, T1, T2, T3, T4, T5, T6, R> {
  <U extends T6>(t1: U): CurriedFunction6R<T0, T1, T2, T3, T4, T5, R>

  <U extends T6, V extends T5>(t1: U, t2: V): CurriedFunction5R<T0, T1, T2, T3, T4, R>

  <U extends T6, V extends T5, W extends T4>(
    t1: U,
    t2: V,
    t3: W,
  ): CurriedFunction4R<T0, T1, T2, T3, R>

  <U extends T6, V extends T5, W extends T4, X extends T3>(
    t1: U,
    t2: V,
    t3: W,
    t4: X,
  ): CurriedFunction3R<T0, T1, T2, R>

  <U extends T6, V extends T5, W extends T4, X extends T3, Y extends T2>(
    t1: U,
    t2: V,
    t3: W,
    t4: X,
    t5: Y,
  ): CurriedFunction2R<T0, T1, R>

  <U extends T6, V extends T5, W extends T4, X extends T3, Y extends T2, Z extends T1>(
    t1: U,
    t2: V,
    t3: W,
    t4: X,
    t5: Y,
    t6: Z,
  ): CurriedFunction1<T0, R>

  <
    U extends T6,
    V extends T5,
    W extends T4,
    X extends T3,
    Y extends T2,
    Z extends T1,
    A extends T0,
  >(
    t1: U,
    t2: V,
    t3: W,
    t4: X,
    t5: Y,
    t6: Z,
    t7: A,
  ): R
}

type ReverseCurryByRuntimeLength<T extends readonly any[], R> =
  Length<T> extends 1
    ? CurriedFunction1<T[0], R>
    : Length<T> extends 2
      ? CurriedFunction2R<T[0], T[1], R>
      : Length<T> extends 3
        ? CurriedFunction3R<T[0], T[1], T[2], R>
        : Length<T> extends 4
          ? CurriedFunction4R<T[0], T[1], T[2], T[3], R>
          : Length<T> extends 5
            ? CurriedFunction5R<T[0], T[1], T[2], T[3], T[4], R>
            : Length<T> extends 6
              ? CurriedFunction6R<T[0], T[1], T[2], T[3], T[4], T[5], R>
              : Length<T> extends 7
                ? CurriedFunction7R<T[0], T[1], T[2], T[3], T[4], T[5], T[6], R>
                : never

export type ReverseCurry<T extends readonly any[], R> = ReverseCurryByRuntimeLength<
  RuntimeRequiredTuple<T>,
  R
>

export type CurryReverse<F extends (...args: any[]) => any> = ReverseCurry<
  Parameters<F>,
  ReturnType<F>
>

export function curry<T extends readonly any[], R>(
  f: (...args: T) => R,
  length?: number,
  args?: unknown[],
): Length<T> extends 0
  ? CurriedFunction0<R>
  : Length<T> extends 1
    ? CurriedFunction1<T[0], R>
    : Length<T> extends 0 | 1
      ? CurriedFunction1Opt1<T[0], R>
      : Length<T> extends 2
        ? CurriedFunction2<T[0], T[1], R>
        : Length<T> extends 2 | 1
          ? CurriedFunction2Opt1<T[0], T[1], R>
          : Length<T> extends 2 | 1 | 0
            ? CurriedFunction2Opt2<T[0], T[1], R>
            : Length<T> extends 3
              ? CurriedFunction3<T[0], T[1], T[2], R>
              : Length<T> extends 3 | 2
                ? CurriedFunction3Opt1<T[0], T[1], T[2], R>
                : Length<T> extends 3 | 2 | 1
                  ? CurriedFunction3Opt2<T[0], T[1], T[2], R>
                  : Length<T> extends 3 | 2 | 1 | 0
                    ? CurriedFunction3Opt3<T[0], T[1], T[2], R>
                    : Length<T> extends 4
                      ? CurriedFunction4<T[0], T[1], T[2], T[3], R>
                      : Length<T> extends 4 | 3
                        ? CurriedFunction4Opt1<T[0], T[1], T[2], T[3], R>
                        : Length<T> extends 4 | 3 | 2
                          ? CurriedFunction4Opt2<T[0], T[1], T[2], T[3], R>
                          : Length<T> extends 4 | 3 | 2 | 1
                            ? CurriedFunction4Opt3<T[0], T[1], T[2], T[3], R>
                            : Length<T> extends 4 | 3 | 2 | 1 | 0
                              ? CurriedFunction4Opt4<T[0], T[1], T[2], T[3], R>
                              : never

export function curry(
  target: (...args: unknown[]) => unknown,
  length: number = target.length,
  args: unknown[] = [],
) {
  const _args: unknown[] = args

  return (...args: unknown[]) => {
    const nextArgs = [..._args, ...args]

    if (nextArgs.length >= length) {
      return target(...nextArgs)
    }

    return curry(target, length, nextArgs)
  }
}

// oxlint-disable-next-line eslint-js/space-before-function-paren
export function curryReverse<T extends readonly any[], R>(
  target: (...args: T) => R,
  length: number = target.length,
  args: unknown[] = [],
): ReverseCurry<T, R> {
  const _args: unknown[] = args

  return ((...args: unknown[]) => {
    const nextArgs = [...args.reverse(), ..._args]

    if (nextArgs.length >= length) {
      return target(...(nextArgs as unknown as T))
    }

    return curryReverse(target, length, nextArgs)
  }) as any
}
