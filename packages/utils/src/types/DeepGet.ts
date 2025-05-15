export type DeepGet<T extends Record<string | symbol | number, any>, P extends any[]> = P extends [infer Key1]
  ? Key1 extends keyof T
    ? T[Key1]
    : never
  : P extends [infer Key1, infer Key2]
    ? Key1 extends keyof T
      ? Key2 extends keyof T[Key1]
        ? T[Key1][Key2]
        : never
      : never
    : P extends [infer Key1, infer Key2, infer Key3]
      ? Key1 extends keyof T
        ? Key2 extends keyof T[Key1]
          ? Key3 extends keyof T[Key1][Key2]
            ? T[Key1][Key2][Key3]
            : never
          : never
        : never
      : P extends [infer Key1, infer Key2, infer Key3, infer Key4]
        ? Key1 extends keyof T
          ? Key2 extends keyof T[Key1]
            ? Key3 extends keyof T[Key1][Key2]
              ? Key4 extends keyof T[Key1][Key2][Key3]
                ? T[Key1][Key2][Key3][Key4]
                : never
              : never
            : never
          : never
        : unknown
