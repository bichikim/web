import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {McpServer, type RegisteredResource} from '@modelcontextprotocol/sdk/server/mcp.js'
import {SubscribeRequestSchema, UnsubscribeRequestSchema} from '@modelcontextprotocol/sdk/types.js'

interface WorkspaceRevision {
  readonly directory: string
  readonly path: string
  readonly uri: string
  readonly resource: RegisteredResource
  revision: number
}

/** Publishes workspace revisions through MCP and host filesystem subscriptions. */
export const registerWorkspaceUpdates = (server: McpServer) => {
  const workspaces = new Map<string, WorkspaceRevision>()
  const resources = new Map<string, WorkspaceRevision>()
  const subscribers = new Set<string>()
  server.server.registerCapabilities({resources: {subscribe: true}})
  server.server.setRequestHandler(SubscribeRequestSchema, async ({params}) => {
    if (!resources.has(params.uri)) {
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
      const current = workspaces.get(session)
      if (current !== undefined) {
        current.revision += 1
        writeFileSync(current.path, JSON.stringify({revision: current.revision}))
        if (subscribers.has(current.uri)) {
          server.server.sendResourceUpdated({uri: current.uri}).catch(() => undefined)
        }
      }
    },
    close: (session: string): void => {
      const current = workspaces.get(session)
      if (current !== undefined) {
        subscribers.delete(current.uri)
        resources.delete(current.uri)
        workspaces.delete(session)
        current.resource.remove()
        rmSync(current.directory, {force: true, recursive: true})
      }
    },
    watch: (session: string): string => {
      const current = workspaces.get(session)
      if (current !== undefined) {
        return current.uri
      }
      // The desktop host subscribes only to file URIs; its watcher observes this signal file.
      const directory = mkdtempSync(join(tmpdir(), 'code-viewer-watch-'))
      const path = join(directory, 'revision.json')
      const uri = pathToFileURL(path).href
      writeFileSync(path, JSON.stringify({revision: 0}))
      const resource = server.registerResource(
        `workspace-${session}`,
        uri,
        {mimeType: 'application/json'},
        async () => ({
          contents: [
            {
              mimeType: 'application/json',
              text: JSON.stringify({revision: workspaces.get(session)?.revision ?? 0}),
              uri,
            },
          ],
        }),
      )
      const workspace: WorkspaceRevision = {directory, path, resource, revision: 0, uri}
      workspaces.set(session, workspace)
      resources.set(uri, workspace)
      return uri
    },
  }
}
