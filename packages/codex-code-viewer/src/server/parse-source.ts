import typescript from '@typescript/typescript6'

export const parseSource = (file: string, text: string): typescript.SourceFile | undefined => {
  const tree = typescript.createSourceFile(file, text, typescript.ScriptTarget.Latest, true)
  return 'parseDiagnostics' in tree &&
    Array.isArray(tree.parseDiagnostics) &&
    tree.parseDiagnostics.length > 0
    ? undefined
    : tree
}
