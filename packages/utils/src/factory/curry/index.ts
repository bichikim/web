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

/* eslint-disable max-len,no-magic-numbers */
export function curry<T1, R>(
  f: (t1?: T1) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction1And1<T1, R>
export function curry<T1, R>(
  f: (t1: T1) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction1<T1, R>
export function curry<T1, T2, R>(
  f: (t1?: T1, t2?: T2) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction2And2<T1, T2, R>
export function curry<T1, T2, R>(
  f: (t1: T1, t2?: T2) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction2And1<T1, T2, R>
export function curry<T1, T2, R>(
  f: (t1: T1, t2: T2) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction2<T1, T2, R>
export function curry<T1, T2, T3, R>(
  f: (t1?: T1, t2?: T2, t3?: T3) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction3And3<T1, T2, T3, R>
export function curry<T1, T2, T3, R>(
  f: (t1: T1, t2?: T2, t3?: T3) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction3And2<T1, T2, T3, R>
export function curry<T1, T2, T3, R>(
  f: (t1: T1, t2: T2, t3?: T3) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction3And1<T1, T2, T3, R>
export function curry<T1, T2, T3, R>(
  f: (t1: T1, t2: T2, t3: T3) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction3<T1, T2, T3, R>
export function curry<T1, T2, T3, T4, R>(
  f: (t1?: T1, t2?: T2, t3?: T3, t4?: T4) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction4And4<T1, T2, T3, T4, R>
export function curry<T1, T2, T3, T4, R>(
  f: (t1: T1, t2?: T2, t3?: T3, t4?: T4) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction4And3<T1, T2, T3, T4, R>
export function curry<T1, T2, T3, T4, R>(
  f: (t1: T1, t2: T2, t3?: T3, t4?: T4) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction4And2<T1, T2, T3, T4, R>
export function curry<T1, T2, T3, T4, R>(
  f: (t1: T1, t2: T2, t3: T3, t4?: T4) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction4And1<T1, T2, T3, T4, R>
export function curry<T1, T2, T3, T4, R>(
  f: (t1: T1, t2: T2, t3: T3, t4: T4) => R,
  length?: number,
  args?: unknown[],
): CurriedFunction4<T1, T2, T3, T4, R>
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
    return curry(target, target.length, nextArgs)
  }
}
