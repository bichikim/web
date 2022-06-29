export function flow<A extends any[], R1, R2, R3, R4, R5, R6, R7>(
  f1: (...args: A) => R1,
  f2: (a: R1) => R2,
  f3: (a: R2) => R3,
  f4: (a: R3) => R4,
  f5: (a: R4) => R5,
  f6: (a: R5) => R6,
  f7: (a: R6) => R7,
): (...args: A) => R7
export function flow<A extends any[], R1, R2, R3, R4, R5, R6, R7>(
  f1: (...args: A) => R1,
  f2: (a: R1) => R2,
  f3: (a: R2) => R3,
  f4: (a: R3) => R4,
  f5: (a: R4) => R5,
  f6: (a: R5) => R6,
  f7: (a: R6) => R7,
  ...func: ((a: any) => any)[]
): (...args: A) => any
export function flow<A extends any[], R1, R2, R3, R4, R5, R6>(
  f1: (...args: A) => R1,
  f2: (a: R1) => R2,
  f3: (a: R2) => R3,
  f4: (a: R3) => R4,
  f5: (a: R4) => R5,
  f6: (a: R5) => R6,
): (...args: A) => R6
export function flow<A extends any[], R1, R2, R3, R4, R5>(
  f1: (...args: A) => R1,
  f2: (a: R1) => R2,
  f3: (a: R2) => R3,
  f4: (a: R3) => R4,
  f5: (a: R4) => R5,
): (...args: A) => R5
export function flow<A extends any[], R1, R2, R3, R4>(
  f1: (...args: A) => R1,
  f2: (a: R1) => R2,
  f3: (a: R2) => R3,
  f4: (a: R3) => R4,
): (...args: A) => R4
export function flow<A extends any[], R1, R2, R3>(
  f1: (...args: A) => R1,
  f2: (a: R1) => R2,
  f3: (a: R2) => R3,
): (...args: A) => R3
export function flow<A extends any[], R1, R2>(
  f1: (...args: A) => R1,
  f2: (a: R1) => R2,
): (...args: A) => R2
export function flow<A extends any[], R1>(f1: (...args: A) => R1): (...args: A) => R1
export function flow(...functions: ((...args: any[]) => any)[]): (...args: any[]) => any {
  return (...args: any[]) => {
    const [first, ...rest] = functions
    let result: any = first(...args)
    rest.forEach((item) => {
      result = item(result)
    })
    return result
  }
}
