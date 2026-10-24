/** Identifies a Ruby declaration name at a one-based UTF-16 column. */
export const isRubyDeclaration = (line: string, column: number): boolean =>
  /(?:^|;)\s*(?:def|class|module)\s+(?:::)?(?:[\p{ID_Continue}]+(?:::|\.))*$/u.test(
    line.slice(0, column - 1),
  ) && !/^[\p{ID_Continue}]+(?:::|\.)/u.test(line.slice(column - 1))
