import {createHash} from 'node:crypto'
import {type McpServer, ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js'
import {registerAppResource, RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server'

/** Registers the viewer under its content identity and the existing file-connection address. */
export const registerViewerResource = (server: McpServer, html: string): string => {
  const revision = createHash('sha256').update(html).digest('hex')
  const uri = `ui://codex-code-viewer/app-${revision}.html`
  const read = async (url: URL) => ({
    contents: [
      {
        _meta: {
          ui: {
            csp: {connectDomains: ['http://127.0.0.1:*'], resourceDomains: ['blob:']},
            prefersBorder: false,
          },
        },
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
        uri: url.href,
      },
    ],
  })
  registerAppResource(server, 'code-viewer', uri, {}, read)
  registerAppResource(server, 'code-viewer-legacy', 'ui://codex-code-viewer/app.html', {}, read)
  server.registerResource(
    'code-viewer-previous-build',
    new ResourceTemplate('ui://codex-code-viewer/app-{revision}.html', {list: undefined}),
    {mimeType: RESOURCE_MIME_TYPE},
    read,
  )
  return uri
}
