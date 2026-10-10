import {z} from 'zod'
import {readJsonStream} from './read-json-stream'
import {
  filesSchema,
  type ScanBatch,
  scanBatchSchema,
  streamEndpointSchema,
  treeSchema,
} from '../shared/contracts'
import {callViewerTool} from './call-viewer-tool'
import type {ViewerPort} from './types'

interface WorkspaceStreamOptions {
  readonly port: Pick<ViewerPort, 'call'>
  readonly name: 'code.tree' | 'code.list'
  readonly input: Record<string, unknown>
  readonly signal: AbortSignal
  readonly receive: (batch: ScanBatch) => void
}
/** Consumes a cancellable local scan, retaining compatibility with snapshot-only servers. */
export const readWorkspaceStream = async (options: WorkspaceStreamOptions): Promise<void> => {
  const result = await callViewerTool({
    input: {...options.input, stream: true},
    name: options.name,
    port: options.port,
    schema: z.union([streamEndpointSchema, treeSchema, filesSchema]),
  })
  options.signal.throwIfAborted()
  if (!('url' in result)) {
    options.receive({
      complete: true,
      directories: 'directories' in result ? (result.directories ?? []) : [],
      directory: '',
      failed: 'truncated' in result && result.truncated,
      files:
        'files' in result ? result.files : result.paths.map((path) => ({openable: true, path})),
      snapshot: true,
    })
    return
  }
  await readJsonStream({...options, schema: scanBatchSchema, url: result.url})
}
