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

const quoteShellArgument = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`

/** Produces a POSIX shell command with literal identity fields and option values. */
export const createKnowledgeGetCommand = (options: CreateKnowledgeGetCommandOptions): string =>
  [
    quoteShellArgument(options.executable),
    quoteShellArgument(options.entryPath),
    'get',
    `--doc-id=${quoteShellArgument(options.identity.docId)}`,
    ...(options.identity.unitId === undefined
      ? []
      : [`--unit-id=${quoteShellArgument(options.identity.unitId)}`]),
    `--repo=${quoteShellArgument(options.repositoryPath)}`,
  ].join(' ')
