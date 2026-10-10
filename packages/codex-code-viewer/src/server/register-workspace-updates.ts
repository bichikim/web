import {McpServer, ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js'
import {SubscribeRequestSchema, UnsubscribeRequestSchema} from '@modelcontextprotocol/sdk/types.js'

const uriFor = (session: string): string => `code-viewer://workspace/${session}`

/** Publishes subscribed workspace revisions through the host's MCP resource channel. */
export const registerWorkspaceUpdates = (server: McpServer) => {
  const revisions = new Map<string, number>()
  const subscribers = new Set<string>()
  server.server.registerCapabilities({resources: {subscribe: true}})
  server.registerResource(
    'workspace-updates',
    new ResourceTemplate('code-viewer://workspace/{session}', {list: undefined}),
    {mimeType: 'application/json'},
    async (uri) => {
      const revision = revisions.get(uri.href)
      if (revision === undefined) {
        throw new Error('Workspace subscription expired')
      }
      return {
        contents: [{mimeType: 'application/json', text: JSON.stringify({revision}), uri: uri.href}],
      }
    },
  )
  server.server.setRequestHandler(SubscribeRequestSchema, async ({params}) => {
    if (!revisions.has(params.uri)) {
      throw new Error('Workspace subscription expired')
    }
    subscribers.add(params.uri)
    return {}
  })
  server.server.setRequestHandler(UnsubscribeRequestSchema, async ({params}) => {
    subscribers.delete(params.uri)
    return {}
  })
  return {
    changed: (session: string): void => {
      const uri = uriFor(session)
      const revision = revisions.get(uri)
      if (revision !== undefined) {
        revisions.set(uri, revision + 1)
        if (subscribers.has(uri)) {
          server.server.sendResourceUpdated({uri}).catch(() => undefined)
        }
      }
    },
    close: (session: string): void => {
      const uri = uriFor(session)
      subscribers.delete(uri)
      revisions.delete(uri)
    },
    watch: (session: string): string => {
      const uri = uriFor(session)
      if (!revisions.has(uri)) {
        revisions.set(uri, 0)
      }
      return uri
    },
  }
}
