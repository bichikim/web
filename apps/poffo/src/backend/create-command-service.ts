import {z} from 'zod'
import {type CommandRequest, commandRequestSchema} from './command-schemas'
import {hashValue} from './hash-value'
import {modelResultSchema} from './protocol'
import type {CommandFailure, CommandResponse, CreateCommandServiceOptions} from './command-types'
import {createCommandContext} from './create-command-context'
import {createReadingOperations} from './create-reading-operations'
import {createModelOperations} from './create-model-operations'
import {createDocumentOperations} from './create-document-operations'
import {createEditingOperations} from './create-editing-operations'
import {createRenderOperation} from './create-render-operation'
export type {
  CommandFileAdapter,
  CreateCommandServiceOptions,
  CommandResponse,
} from './command-types'

const failure = (code: string, message = code): CommandFailure => ({
  error: {code, message},
  ok: false,
})

/** Uses one command catalog for local calls, HTTP, CLI, and MCP. */
export const createCommandService = (options: CreateCommandServiceOptions) => {
  const {model} = options
  const context = createCommandContext(options)
  const operations = [
    ...createReadingOperations(context),
    ...createModelOperations(context),
    ...createDocumentOperations(context),
    ...createEditingOperations(context),
    createRenderOperation(context),
  ]
  const catalog = () => operations.map(({run: _run, ...metadata}) => metadata)
  const run = async (request: CommandRequest): Promise<CommandResponse> => {
    const validated = commandRequestSchema.safeParse(request)
    if (!validated.success) {
      return failure('invalid-argument', validated.error.message)
    }
    if (request.operation === 'operations.list') {
      const view = model.read()
      return {ok: true, revision: view.revision, sessionId: view.sessionId, value: catalog()}
    }
    const operation = operations.find(({id}) => id === request.operation)
    if (operation === undefined) {
      return failure('unknown-operation')
    }
    try {
      const value = await operation.run(request.input, request.requestId)
      const modelResult = modelResultSchema.safeParse(value)
      if (modelResult.success && !modelResult.data.ok) {
        return failure(modelResult.data.error.code)
      }
      const view = model.read()
      return {ok: true, revision: view.revision, sessionId: view.sessionId, value}
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command failed'
      return failure(
        error instanceof z.ZodError ? 'invalid-argument' : message.split(':')[0]!,
        message,
      )
    }
  }
  const receipts = new Map<string, {fingerprint: string; result: Promise<CommandResponse>}>()
  const readOperations = new Set([
    'status',
    'document.read',
    'document.inspect',
    'operations.list',
    'edit.preview',
  ])
  const execute = async (request: CommandRequest): Promise<CommandResponse> => {
    if (readOperations.has(request.operation)) {
      return run(request)
    }
    const fingerprint = await hashValue(request)
    const previous = receipts.get(request.requestId)
    if (previous !== undefined) {
      return previous.fingerprint === fingerprint ? previous.result : failure('request-id-conflict')
    }
    const result = run(request)
    receipts.set(request.requestId, {fingerprint, result})
    const MAXIMUM_RECEIPTS = 256
    if (receipts.size > MAXIMUM_RECEIPTS) {
      receipts.delete(receipts.keys().next().value!)
    }
    return result
  }
  return {catalog, execute}
}
