type InverseArray<A extends any[]> = A extends [infer A1]
  ? [A1]
  : A extends [infer A1, infer A2]
    ? [A2, A1]
    : A extends [infer A1, a2?: infer A2]
      ? [A2 | undefined, A1]
      : A extends [infer A1, infer A2, infer A3]
        ? [A3, A2, A1]
        : A extends [infer A1, a2?: infer A2, a3?: infer A3]
          ? [A3 | undefined, A2 | undefined, A1]
          : A extends [infer A1, infer A2, a3?: infer A3]
            ? [A3 | undefined, A2, A1]
            : A extends [infer A1, infer A2, infer A3, infer A4]
              ? [A4, A3, A2, A1]
              : A extends [infer A1, a2?: infer A2, a3?: infer A3, a4?: infer A4]
                ? [A4 | undefined, A3 | undefined, A2 | undefined, A1]
                : A extends [infer A1, infer A2, a3?: infer A3, a4?: infer A4]
                  ? [A4 | undefined, A3 | undefined, A2, A1]
                  : A extends [infer A1, infer A2, infer A3, a4?: infer A4]
                    ? [A4 | undefined, A3, A2, A1]
                    : A extends [infer A1, infer A2, infer A3, a4?: infer A4]
                      ? [A4 | undefined, A3, A2, A1]
                      : A extends [infer A1, infer A2, infer A3, infer A4, infer A5]
                        ? [A5, A4, A3, A2, A1]
                        : A extends [infer A1, a2?: infer A2, a3?: infer A3, a4?: infer A4, a5?: infer A5]
                          ? [A5 | undefined, A4 | undefined, A3 | undefined, A2 | undefined, A1]
                          : A extends [infer A1, infer A2, a3?: infer A3, a4?: infer A4, a5?: infer A5]
                            ? [A5 | undefined, A4 | undefined, A3 | undefined, A2, A1]
                            : A extends [infer A1, infer A2, infer A3, a4?: infer A4, a5?: infer A5]
                              ? [A5 | undefined, A4 | undefined, A3, A2, A1]
                              : A extends [infer A1, infer A2, infer A3, infer A4, a5?: infer A5]
                                ? [A5 | undefined, A4, A3, A2, A1]
                                : unknown[]

/**
 * Creates a function with inverted parameter order
 * @param targetFunction
 */
export const invertParams = <F extends (...args: any[]) => any>(targetFunction: F) => {
  return (...args: InverseArray<Parameters<F>>): ReturnType<F> => {
    return targetFunction(...(args.reverse() as any))
  }
}

/**
 * @deprecated Use `invertParams` instead
 */
export const createInverseOrderParameters = invertParams
