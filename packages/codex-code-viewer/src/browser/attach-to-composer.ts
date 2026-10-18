import type {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {type CallToolResult, CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {z} from 'zod'
import {errorSchema, failure, success} from '../shared/contracts'
import {toolResult} from '../server/tool-result'
import type {ComposerAttachment} from './create-composer-attachment'
import {chatAttachmentSchema} from '../shared/chat-attachment'

interface ComposerToolOptions {
  readonly client: Pick<Client, 'callTool'>
  readonly composer: ComposerAttachment
  readonly session: string
  readonly viewer: string
  readonly attachment?: unknown
}

/** Exports the requested attachment, or the pending list, and confirms its native card. */
export const attachToComposer = async (options: ComposerToolOptions): Promise<CallToolResult> => {
  const attachment = chatAttachmentSchema.optional().parse(options.attachment)
  const result = await options.composer(options.viewer, async () => {
    const copied = CallToolResultSchema.parse(
      await options.client.callTool({
        arguments: {...(attachment === undefined ? {} : {attachment}), session: options.session},
        name: 'code.copy-attachments',
      }),
    )
    if (copied.isError) {
      const error = errorSchema.safeParse(copied.structuredContent)
      return {error: error.success ? error.data : {code: 'clipboard-unavailable'}, ok: false}
    }
    const exported = z.object({path: z.string().min(1)}).parse(copied.structuredContent)
    return {ok: true, value: exported.path}
  })
  return toolResult(result.ok ? success({attached: true}) : failure(result.error.code))
}
