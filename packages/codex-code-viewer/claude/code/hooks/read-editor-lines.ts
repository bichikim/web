import {sourceLines} from '../../../src/headless/source-lines'

/** Maps the editor's lossless text buffer to logical lines across every source separator. */
export const readEditorLines = (document: {readonly toString: () => string}) => {
  const source = document.toString()
  const lines = sourceLines(source)
  return {
    length: source.length,
    line: (number: number) => lines[number - 1]!,
    lineAt: (offset: number) => lines.findLast((line) => line.from <= offset)!,
    lines: lines.length,
    toString: () => source,
  }
}
