import {syntaxTree} from '@codemirror/language'
import type {EditorState} from '@codemirror/state'
import type {CodeToken} from '../../shared/contracts'
import {fileFormat, type SyntaxLanguage} from '../../shared/file-formats'
import {isNavigableFile} from '../../shared/is-navigable-file'
import {isSourcePath} from '../../shared/is-source-path'

const identifiers = new Set([
  'VariableName',
  'VariableDefinition',
  'PropertyName',
  'PropertyDefinition',
  'TypeName',
  'TypeDefinition',
  'JSXIdentifier',
])

const navigableString = (value: string, module: boolean): boolean =>
  !value.includes('${') && (isSourcePath(value) || module)

const scriptReference = (state: EditorState, position: number): boolean => {
  const {parent} = syntaxTree(state).resolveInner(position, 1)
  if (
    parent !== null &&
    ['ImportDeclaration', 'ExportDeclaration', 'DynamicImport'].includes(parent.name)
  ) {
    return true
  }
  const expression = parent?.name === 'ArgList' ? parent.parent?.firstChild : null
  return (
    expression?.name === 'VariableName' &&
    state.sliceDoc(expression.from, expression.to) === 'require'
  )
}

const sourceLanguages = new Set<SyntaxLanguage>(['python', 'ruby', 'rust'])
const sourceNavigation = (
  state: EditorState,
  name: string,
  from: number,
  language: SyntaxLanguage,
): CodeToken['navigation'] => {
  if (language === 'ruby' && name === 'string') {
    const prefix = state.sliceDoc(state.doc.lineAt(from).from, from)
    return /\b(?:require|require_relative)\s*(?:\(\s*)?$/u.test(prefix) ? 'path' : null
  }
  return ['variableName', 'typeName', 'propertyName'].includes(name.split('.')[0])
    ? 'definition'
    : null
}

interface SyntaxPoint {
  readonly name: string
  readonly from: number
  readonly to: number
}
const PATH_PREFIX_LENGTH = 3
const scriptNavigation = (
  state: EditorState,
  node: SyntaxPoint,
  position: number,
  code: boolean,
): CodeToken['navigation'] => {
  if (code && identifiers.has(node.name)) {
    return 'definition'
  }
  if (!['String', 'TemplateString'].includes(node.name)) {
    return null
  }
  const module = code && scriptReference(state, position)
  const start = node.from + 1
  const prefix = state.sliceDoc(start, Math.min(node.to, start + PATH_PREFIX_LENGTH))
  if (!module && !isSourcePath(prefix)) {
    return null
  }
  return navigableString(state.sliceDoc(start, node.to - 1), module) ? 'path' : null
}

/** Converts a navigable editor position to a source token, excluding ordinary text and comments. */
export const navigationToken = (
  state: EditorState,
  position: number,
  path: string,
  readOffset?: (position: number) => number,
): CodeToken | null => {
  if (!isNavigableFile(path)) {
    return null
  }
  const node = syntaxTree(state).resolveInner(position, 1)
  if (position < node.from || position >= node.to) {
    return null
  }
  const format = fileFormat(path)
  const navigation =
    format?.kind === 'syntax' && sourceLanguages.has(format.language)
      ? sourceNavigation(state, node.name, node.from, format.language)
      : scriptNavigation(state, node, position, format?.kind === 'code')
  if (navigation === null) {
    return null
  }
  return {
    kind: navigation === 'path' ? 'string' : 'identifier',
    navigation,
    offset:
      readOffset?.(position) ??
      position + (state.lineBreak.length - 1) * (state.doc.lineAt(position).number - 1),
    text: state.sliceDoc(node.from, node.to),
  }
}
