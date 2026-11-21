import type {KnowledgeIdentity} from '../indexing/read'

export interface CreateKnowledgeGetCommandOptions {
  /** Literal stored document and optional unit fields; an omitted unit selects the whole document. */
  readonly identity: KnowledgeIdentity
  /** Absolute repository location used by the copied command. */
  readonly repositoryPath: string
  /** Absolute Node executable, independent of a globally installed know command. */
  readonly executable: string
  /** Absolute path to this package's know.mjs entrypoint. */
  readonly entryPath: string
}

const quoteShellArgument = (value: string): string =>
  `'${value.replaceAll("'", "'\\''").replaceAll('\n', `'"$knowledge_get_newline"'`)}'`

/** Produces one POSIX shell command line with literal identity fields and option values. */
export const createKnowledgeGetCommand = (options: CreateKnowledgeGetCommandOptions): string => {
  const {entryPath, executable, identity, repositoryPath} = options
  const {docId, unitId} = identity
  const command = [
    quoteShellArgument(executable),
    quoteShellArgument(entryPath),
    'get',
    `--doc-id=${quoteShellArgument(docId)}`,
    ...(unitId === undefined ? [] : [`--unit-id=${quoteShellArgument(unitId)}`]),
    `--repo=${quoteShellArgument(repositoryPath)}`,
  ].join(' ')
  const hasNewline = [executable, entryPath, docId, unitId, repositoryPath].some((value) =>
    value?.includes('\n'),
  )
  // Keep a sentinel until command substitution has finished stripping trailing newlines.
  return hasNewline
    ? `(knowledge_get_newline=$(printf '\\n.'); knowledge_get_newline=\${knowledge_get_newline%.}; ${command})`
    : command
}
