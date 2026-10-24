export type DeepGet<T, Path extends readonly PropertyKey[]> = Path extends readonly [
  infer Key,
  ...infer Rest extends readonly PropertyKey[],
]
  ? Key extends keyof T
    ? DeepGet<T[Key], Rest>
    : never
  : T
