import {z} from 'zod'
import {documentSchema, errorSchema} from '../shared/contracts'
import {callViewerTool} from './call-viewer-tool'
import type {ViewerPort} from './types'

interface SaveCodeSourceOptions {
  readonly input: {
    readonly path: string
    readonly revision: string | null
    readonly session: string
    readonly source: string
  }
  readonly port: Pick<ViewerPort, 'call'>
  readonly onMissing?: () => void
}

/** Saves source and exclusively recreates it if deletion is discovered during the write. */
export const saveCodeSource = async (options: SaveCodeSourceOptions) => {
  const write = (revision: string | null) =>
    callViewerTool({
      input: {...options.input, revision},
      name: 'code.write',
      port: options.port,
      schema: z.object({document: documentSchema}),
    })
  try {
    return await write(options.input.revision)
  } catch (error) {
    const parsed = errorSchema.safeParse(error instanceof Error ? error.cause : error)
    if (parsed.success && parsed.data.code === 'not-found' && options.input.revision !== null) {
      options.onMissing?.()
      return write(null)
    }
    throw error
  }
}
