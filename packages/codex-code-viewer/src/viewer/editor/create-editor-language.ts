import type {Extension} from '@codemirror/state'
import {javascript} from '@codemirror/lang-javascript'
import {createSyntaxLanguage} from '../../shared/create-syntax-language'
import {fileFormat} from '../../shared/file-formats'

/** Selects syntax support for editable source formats and leaves ordinary text unparsed. */
export const createEditorLanguage = (path: string): Extension => {
  const format = fileFormat(path)
  if (format?.kind === 'code') {
    return javascript({
      jsx: /\.[jt]sx$/iu.test(path),
      typescript: /\.(?:ts|tsx|mts|cts)$/iu.test(path),
    })
  }
  if (format?.kind !== 'syntax') {
    return []
  }
  return createSyntaxLanguage(format.language) ?? []
}
