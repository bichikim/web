const hasModuleCall = (source: string): boolean => {
  const trailingTrivia = /\s+|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/uy
  const callSyntax = /[<(]|\?\./uy
  for (const name of source.matchAll(/\b(?:require|import)\b/gu)) {
    let cursor = name.index + name[0].length
    trailingTrivia.lastIndex = cursor
    // Consume each complete comment once instead of backtracking between trivia segments.
    while (trailingTrivia.test(source)) {
      cursor = trailingTrivia.lastIndex
    }
    callSyntax.lastIndex = cursor
    if (callSyntax.test(source)) {
      return true
    }
  }
  return false
}
const trivia = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)*`
// Consume whole trivia spans so operators inside comments cannot become binding syntax.
const bindingStart = new RegExp(String.raw`(?:\bconst\b|,)(?=(${trivia}))\1\{`, 'u')
const bindingType = new RegExp(String.raw`\}(?=(${trivia}))\1[!:]`, 'u')
const bindingValue = new RegExp(
  String.raw`\}(?=(${trivia}))\1=(?=((?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|\bawait\b|\()*))\2\b(?:require|import)\b`,
  'u',
)
const bindingEnd = /\}\s*[=:!/]/u

const hasComplexComments = (source: string): boolean => {
  let start = source.indexOf('/*')
  while (start !== -1) {
    const end = source.indexOf('*/', start + 2)
    const next = source.indexOf('/*', start + 2)
    if (end === -1 || (next !== -1 && next < end)) {
      return true
    }
    start = next
  }
  return false
}

/** Retains possible immutable module destructuring, leaving lexical and type ambiguities to the parser. */
export const mayHaveModuleBindings = (source: string): boolean => {
  const escaped = source.includes('\\u')
  return (
    (escaped || hasModuleCall(source)) &&
    bindingEnd.test(source) &&
    (escaped ||
      hasComplexComments(source) ||
      (bindingStart.test(source) && (bindingType.test(source) || bindingValue.test(source))))
  )
}
