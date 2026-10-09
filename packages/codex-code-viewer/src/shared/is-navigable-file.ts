import {fileFormat, type SyntaxLanguage} from './file-formats'

const languages = new Set<SyntaxLanguage>(['json', 'jsonc', 'json5', 'python', 'ruby', 'rust'])

/** Identifies documents whose drafts participate in source navigation. */
export const isNavigableFile = (path: string): boolean => {
  const format = fileFormat(path)
  return format?.kind === 'code' || (format?.kind === 'syntax' && languages.has(format.language))
}
