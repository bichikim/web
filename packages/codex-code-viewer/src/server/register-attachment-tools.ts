import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {z} from 'zod'
import {failure, success} from '../shared/contracts'
import {CONTEXT_SEPARATOR, MAX_CONTEXT_BYTES, MAX_CONTEXT_ITEMS} from '../shared/context-limits'
import type {createSessions} from './create-sessions'
import type {ClipboardPort} from './create-clipboard'
import {chatAttachmentSchema} from '../shared/chat-attachment'
import {readAttachmentFile} from './read-attachment-file'

/** Registers session-scoped attachment snapshots for explicit model retrieval. */
export const registerAttachmentTools = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
  contexts: Map<string, readonly string[]>,
  clipboard?: Pick<ClipboardPort, 'writeAttachment'>,
): void => {
  const copy = clipboard?.writeAttachment
  if (copy !== undefined) {
    server.registerTool(
      'code.copy-attachments',
      {
        _meta: {ui: {visibility: ['app']}},
        annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: false},
        inputSchema: {attachment: chatAttachmentSchema.optional(), session: z.string()},
        title: 'Copy selected snapshots as a native attachment file',
      },
      async ({session, attachment}) =>
        withSession(session, async (workspace) => {
          if (attachment !== undefined) {
            if (attachment.kind === 'file') {
              const file = readAttachmentFile(workspace.root, attachment.path)
              if (!file.ok) {
                return file
              }
              const result = await copy(file.value.bytes, file.value.filename)
              return result.ok ? success({copied: true, path: result.value}) : result
            }
            const result = await (attachment.filename === undefined
              ? copy(attachment.text)
              : copy(attachment.text, attachment.filename))
            return result.ok ? success({copied: true, path: result.value}) : result
          }
          const content = contexts.get(session) ?? []
          if (content.length === 0) {
            return failure('not-found')
          }
          const result = await copy(content.join(CONTEXT_SEPARATOR))
          return result.ok ? success({copied: true, path: result.value}) : result
        }),
    )
  }
  server.registerTool(
    'code.stage-context',
    {
      _meta: {ui: {visibility: ['app']}},
      annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: false},
      inputSchema: {
        content: z.array(z.string().max(MAX_CONTEXT_BYTES)).max(MAX_CONTEXT_ITEMS),
        session: z.string(),
      },
      title: 'Replace pending viewer attachments',
    },
    async ({session, content}) =>
      withSession(session, () => {
        if (new TextEncoder().encode(content.join(CONTEXT_SEPARATOR)).length > MAX_CONTEXT_BYTES) {
          return failure('context-too-large')
        }
        contexts.set(session, [...content])
        return success({count: content.length})
      }),
  )
  server.registerTool(
    'code.attachments',
    {
      _meta: {ui: {visibility: ['model']}},
      annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: true},
      description: [
        'Read the user-selected Code Viewer attachments, including unsaved code and draft diffs.',
        'Call this whenever the user refers to viewer attachments or selected/unsaved code.',
        'Use the session returned by code.open or code.panel; these snapshots may differ from files on disk.',
        'Does not consume attachments.',
      ].join(' '),
      inputSchema: {session: z.string()},
      title: 'Read Code Viewer attachments',
    },
    async ({session}) => {
      const result = await withSession(session, () =>
        success({content: contexts.get(session) ?? []}),
      )
      if (result.isError) {
        return result
      }
      return {
        content: (contexts.get(session) ?? []).map((text) => ({text, type: 'text' as const})),
      }
    },
  )
}
