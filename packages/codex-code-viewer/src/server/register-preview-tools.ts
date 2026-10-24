import {previewOfficeDocument} from './preview-office-document'
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {z} from 'zod'
import {parseDelimitedText} from '../viewer/parse-delimited-text'
import {MAX_CODE_BYTES} from '../shared/editing-limits'
import {success} from '../shared/contracts'
import type {createSessions} from './create-sessions'
import {tokenizeDocument} from './tokenize-document'
/** Registers session-scoped, read-only draft presentation operations. */
export const registerPreviewTools = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
): void => {
  const metadata = {
    _meta: {ui: {visibility: ['app']}},
    annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: true},
  }
  server.registerTool(
    'code.preview',
    {
      ...metadata,
      inputSchema: {
        delimiter: z.enum([',', '\t']),
        session: z.string(),
        source: z.string().max(MAX_CODE_BYTES),
      },
      title: 'Parse a draft table for native viewers',
    },
    async ({session, source, delimiter}) =>
      withSession(session, () => success({...parseDelimitedText({delimiter, source})})),
  )
  server.registerTool(
    'code.documentPreview',
    {
      ...metadata,
      inputSchema: {path: z.string(), revision: z.string(), session: z.string()},
      title: 'Preview a local Office document for native viewers',
    },
    async ({session, path, revision}) =>
      withSession(session, async (workspace) => {
        const result = await previewOfficeDocument({path, revision, root: workspace.root})
        return result.ok ? success({...result.value}) : result
      }),
  )
  server.registerTool(
    'code.pdfPreview',
    {
      ...metadata,
      inputSchema: {
        page: z.number().int().positive(),
        path: z.string(),
        revision: z.string(),
        session: z.string(),
      },
      title: 'Preview a local PDF page for native viewers',
    },
    async ({session, path, revision, page}) =>
      withSession(session, async (workspace) => {
        const {previewPdf} = await import('./preview-pdf')
        const result = await previewPdf({page, path, revision, root: workspace.root})
        return result.ok ? success({...result.value}) : result
      }),
  )
  server.registerTool(
    'code.highlight',
    {
      ...metadata,
      inputSchema: {path: z.string(), session: z.string(), source: z.string().max(MAX_CODE_BYTES)},
      title: 'Highlight a draft for native viewers',
    },
    async ({session, path, source}) =>
      withSession(session, () => success({lines: tokenizeDocument(path, source)})),
  )
}
