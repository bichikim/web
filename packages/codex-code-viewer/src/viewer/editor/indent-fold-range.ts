import type {EditorState} from '@codemirror/state'
import {syntaxTree} from '@codemirror/language'
import {fileFormat} from '../../shared/file-formats'

/** Finds an indented body for stream-parsed languages, excluding string and comment headers. */
export const indentFoldRange = (state: EditorState, start: number, end: number, path: string) => {
  const format = fileFormat(path)
  if (
    format?.kind !== 'syntax' ||
    !['python', 'ruby', 'rust', 'sass', 'scss', 'less', 'toml'].includes(format.language)
  ) {
    return null
  }
  const line = state.doc.lineAt(start)
  const header = line.text.trimEnd()
  const body = header.replace(/\s+#.*$/u, '')
  const supported =
    (format.language === 'sass' && body.trim() !== '') ||
    /[{[(:]$/u.test(body) ||
    (format.language === 'ruby' &&
      /^(?:\s*(?:def|class|module|if|unless|case|begin|while|until|for)\b)|\bdo(?:\s*\|[^|]*\|)?\s*$/u.test(
        body,
      ))
  if (!supported || /^\s*(?:#|\/\/)/u.test(header)) {
    return null
  }
  const {name} = syntaxTree(state).resolveInner(start + line.text.search(/\S/u), 1)
  if (/string|comment/iu.test(name)) {
    return null
  }
  const indent = /^\s*/u.exec(line.text)![0].replaceAll('\t', '    ').length
  let last = end
  for (let number = line.number + 1; number <= state.doc.lines; number += 1) {
    const next = state.doc.line(number)
    if (next.text.trim() !== '') {
      const depth = /^\s*/u.exec(next.text)![0].replaceAll('\t', '    ').length
      if (depth <= indent) {
        return last > end ? {from: end, to: last} : null
      }
      last = next.to
    }
  }
  return last > end ? {from: end, to: last} : null
}
