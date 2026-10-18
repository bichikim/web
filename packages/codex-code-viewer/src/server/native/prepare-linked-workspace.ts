import type {createNativeClient} from './create-native-client'
import type {createWorkspaceLinks} from './create-workspace-links'

/** Prepares native projects and linking metadata, rejecting input changes during preparation. */
export const prepareLinkedWorkspace = async (
  client: Pick<ReturnType<typeof createNativeClient>, 'prepare' | 'query'>,
  workspace: Pick<
    ReturnType<typeof createWorkspaceLinks>,
    'checkpoint' | 'documents' | 'prepare' | 'point'
  >,
  prepareMetadata: () => boolean = () => true,
): Promise<ReadonlyMap<string, string | null>> => {
  const previous = await workspace.checkpoint()
  const documents = workspace.documents()
  await client.prepare(documents)
  if (prepareMetadata()) {
    workspace.prepare()
  }
  const [first] = documents
  const point = first === undefined ? undefined : workspace.point({column: 1, line: 1, path: first})
  if (point !== undefined) {
    await client.query({...point, kind: 'definition', receive: () => undefined})
  }
  const current = await workspace.checkpoint()
  if ([...previous].some(([path, revision]) => current.get(path) !== revision)) {
    throw new Error('stale-source')
  }
  return current
}
