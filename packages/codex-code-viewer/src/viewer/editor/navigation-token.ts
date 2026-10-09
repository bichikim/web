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

/** Converts a navigable editor position to a source token, excluding ordinary text and comments. */
export const navigationToken = (
  state: EditorState,
  position: number,
  path: string,
): CodeToken | null => {
  if (!isNavigableFile(path)) {
    return null
  }
  const node = syntaxTree(state).resolveInner(position, 1)
  if (position < node.from || position >= node.to) {
    return null
  }
  const text = state.sliceDoc(node.from, node.to)
  const format = fileFormat(path)
  if (format?.kind === 'syntax' && sourceLanguages.has(format.language)) {
    const navigation = sourceNavigation(state, node.name, node.from, format.language)
    return navigation === null
      ? null
      : {
          kind: navigation === 'path' ? 'string' : 'identifier',
          navigation,
          offset: state.sliceDoc(0, position).length,
          text,
        }
  }
  const value = text.slice(1, -1)
  const code = format?.kind === 'code'
  const string = node.name === 'String' || node.name === 'TemplateString'
  const reference = string && navigableString(value, code && scriptReference(state, position))
  if (!reference && !(code && identifiers.has(node.name))) {
    return null
  }
  return {
    kind: reference ? 'string' : 'identifier',
    navigation: reference ? 'path' : 'definition',
    offset: state.sliceDoc(0, Math.min(position, state.doc.length)).length,
    text,
  }
}
