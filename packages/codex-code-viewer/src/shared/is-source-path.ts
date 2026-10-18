/** Identifies relative or absolute file references in source string values. */
export const isSourcePath = (value: string): boolean => /^(?:\.{1,2}[/\\]|\/)/u.test(value)
