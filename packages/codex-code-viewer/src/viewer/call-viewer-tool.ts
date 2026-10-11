import type {z} from 'zod'
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
  return options.schema.parse(result.structuredContent)
}
