import {readFile} from 'node:fs/promises'
import {realpathSync, statSync} from 'node:fs'
import {isAbsolute} from 'node:path'
import {fileURLToPath} from 'node:url'
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {createBrowserWorkspaces} from './create-browser-workspaces'
import {createComposerAttachment} from './create-composer-attachment'
import manifest from '../../package.json'
import plugin from '../../claude/code/plugin.json'
import {z} from 'zod'
import {type CodeLocation, documentSchema} from '../shared/contracts'

const [path, ...extra] = process.argv.slice(2)
if (path === undefined || !isAbsolute(path) || extra.length > 0 || !statSync(path).isDirectory()) {
  throw new Error('Usage: node browser.js /absolute/workspace/folder')
}
const workspaceRoot = realpathSync(path)
const appHtml = (await readFile(new URL('./app.html', import.meta.url), 'utf8')).replace(
  '<html ',
  '<html data-host="standard" ',
)
const html = await readFile(new URL('./browser.html', import.meta.url), 'utf8')
const clipboardEnabled = process.env.CODE_VIEWER_CLIPBOARD === 'true'
const workspaces = createBrowserWorkspaces(workspaceRoot, {
  appHtml,
  clipboardEnabled,
  html,
  ...(clipboardEnabled && process.platform === 'darwin'
    ? {
        composer: createComposerAttachment(
          fileURLToPath(new URL('../runtime/Code Viewer Attachment.app', import.meta.url)),
        ),
      }
    : {}),
})
let active: Awaited<ReturnType<typeof workspaces.get>>
const server = new McpServer(
  {name: 'code-viewer-browser', version: manifest.version},
  {
    instructions: [
      'When the user asks to open Code Viewer, call code.browser,',
      'then navigate its full URL in the Code Browser pane. No terminal setup is needed.',
      'To show a particular project file, pass path and optional 1-based line and column to code.browser.',
      'Pass workspace with the session’s current absolute working directory when using a linked Git worktree.',
      'Do not open or navigate on session startup or merely to explain or modify code.',
      'The Mod tracks file locations and updates a viewer the user already opened.',
      'If this viewer is already open, it updates in place; do not navigate or reload the Browser again.',
      'When the user mentions Code Viewer attachments or selected/unsaved code,',
      'call code.attachments before answering.',
      'Browser snapshots may differ from disk. Do not read files as a substitute for attachments.',
    ].join(' '),
  },
)
server.registerPrompt(
  'open-code-viewer',
  {description: plugin.commands.open.description, title: 'Open Code Viewer'},
  async () => ({
    messages: [{content: {text: plugin.commands.open.content, type: 'text'}, role: 'user'}],
  }),
)
server.registerTool(
  'code.browser',
  {
    annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: true},
    description: [
      'Open the persistent Code Viewer in the Claude Code Browser pane. Returns a private localhost URL.',
      'Navigate the Browser pane to that URL including its fragment, and keep it next to the chat.',
      'Reuses this conversation’s viewer session.',
      'Pass path to show a project file, optionally at a 1-based line and column.',
      'Use only when the user asks to open the viewer or a file.',
      'The Mod updates locations in an already opened viewer.',
      'An already open viewer updates in place. Do not navigate or reload it again, to preserve unsaved drafts.',
    ].join(' '),
    inputSchema: z
      .object({
        column: z.number().int().positive().optional(),
        line: z.number().int().positive().optional(),
        path: z
          .string()
          .min(1)
          .optional()
          .describe('Project-relative or absolute file path inside this project.'),
        workspace: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Current session directory. Must be the launch folder or a worktree of the same Git repository.',
          ),
      })
      .refine(
        (input) =>
          input.path !== undefined || (input.line === undefined && input.column === undefined),
        {
          message: 'Specify path when providing line or column.',
        },
      ),
    title: 'Open Code Viewer',
  },
  async ({path: requestedPath, line = 1, column = 1, workspace}) => {
    const selected =
      workspace === undefined
        ? (active ?? (await workspaces.get()))
        : await workspaces.get(workspace)
    if (selected === undefined) {
      return {
        content: [{text: 'Workspace is outside the connected repository.', type: 'text'}],
        isError: true,
        structuredContent: {code: 'outside-workspace'},
      }
    }
    const {browser} = selected
    const location = await browser.open()
    let target: CodeLocation | undefined
    if (requestedPath !== undefined) {
      const result = await browser.navigate({column, line, path: requestedPath})
      if (result.isError) {
        return result
      }
      target = documentSchema.parse(result.structuredContent?.document).location
    }
    active = selected
    return {
      content: [
        {
          text: `[Open Code Viewer](${location.url})\nWorkspace: ${location.workspace}`,
          type: 'text',
        },
      ],
      structuredContent: {
        ...location,
        capabilities: {clipboard: clipboardEnabled, reveal: process.platform === 'darwin'},
        ...(target === undefined ? {} : {location: target}),
      },
    }
  },
)
server.registerTool(
  'code.attachments',
  {
    annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: true},
    description: [
      'Read the user-selected attachments from this conversation’s Code Viewer Browser panel,',
      'including unsaved code and draft diffs. Call whenever the user refers to viewer attachments.',
      'Does not send a message, save a file, or consume the attachments.',
    ].join(' '),
    inputSchema: {},
    title: 'Read Code Viewer Browser attachments',
  },
  async () => {
    const selected = active ?? (await workspaces.get())
    if (selected === undefined) {
      throw new Error('Missing initial workspace.')
    }
    const {browser, client} = selected
    const {session} = await browser.open()
    return CallToolResultSchema.parse(
      await client.callTool({arguments: {session}, name: 'code.attachments'}),
    )
  },
)
let closing: Promise<void> | undefined
const close = (): Promise<void> => {
  closing ??= (async () => {
    await workspaces.close()
    await server.close()
  })()
  return closing
}
process.once('SIGINT', close)
process.once('SIGTERM', close)
process.stdin.once('end', close)
await server.connect(new StdioServerTransport())
