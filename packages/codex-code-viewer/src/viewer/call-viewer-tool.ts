import {hasDeferredSource} from '../shared/has-deferred-source'
import {z} from 'zod'
import {documentSchema} from '../shared/contracts'
import {loadDocumentSource} from './load-document-source'
import {errorMessage} from './error-message'
import type {ViewerPort, ViewerRequestOptions} from './types'

interface CallViewerToolOptions<Value> {
  input: Record<string, unknown>
  name: string
  port: Pick<ViewerPort, 'call'>
  schema: z.ZodType<Value>
  request?: ViewerRequestOptions
}

/** Calls a viewer tool and validates its result, rejecting tool errors with a readable message. */
export const callViewerTool = async <Value>(
  options: CallViewerToolOptions<Value>,
): Promise<Value> => {
  const result =
    options.request === undefined
      ? await options.port.call(options.name, options.input)
      : await options.port.call(options.name, options.input, options.request)
  if (result.isError) {
    throw new Error(errorMessage(result.structuredContent), {cause: result.structuredContent})
  }
  const raw = result.structuredContent?.document
  if (typeof raw === 'object' && raw !== null && 'sourceLength' in raw) {
    const document = documentSchema.parse(raw)
    if (hasDeferredSource(document)) {
      const session = z.string().parse(result.structuredContent?.session ?? options.input.session)
      const source = await loadDocumentSource({
        document,
        port: options.port,
        request: options.request,
        session,
      })
      return options.schema.parse({...result.structuredContent, document: {...document, source}})
    }
  }
  return options.schema.parse(result.structuredContent)
}
