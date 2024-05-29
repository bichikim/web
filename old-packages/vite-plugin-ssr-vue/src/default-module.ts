export const defaultModule = <T extends Record<string, any>>(
  module: T,
): T extends {default: infer P} ? P : T => {
  return module.default ?? module
}
