import type {z} from 'zod'
import {errorMessage} from './error-message'
import type {ViewerPort} from './types'

interface CallViewerToolOptions<Value> {
  input: Record<string, unknown>
  name: string
  port: ViewerPort
  schema: z.ZodType<Value>
}

/** Calls a viewer tool and validates its result, rejecting tool errors with a readable message. */
export const callViewerTool = async <Value>(
  options: CallViewerToolOptions<Value>,
): Promise<Value> => {
  const result = await options.port.call(options.name, options.input)
  if (result.isError) {
    throw new Error(errorMessage(result.structuredContent))
  }
  return options.schema.parse(result.structuredContent)
}
