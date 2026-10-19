import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {version} from '../../package.json'
import {readPluginRelease} from './read-plugin-release'
import {runPluginUpdate} from './run-plugin-update'
import {type PluginUpdate, pluginUpdateErrorSchema, versionSchema} from '../shared/plugin-updates'
import {createPluginUpdates} from './create-plugin-updates'

/** 버전 확인과 설치를 앱 전용 도구로 제공한다. */
export const registerUpdateTools = (server: McpServer, target: PluginUpdate['target']): void => {
  const updates = createPluginUpdates({
    current: version,
    port: {install: (latest) => runPluginUpdate(latest, target), readLatest: readPluginRelease},
    target,
  })
  server.registerTool(
    'code.update-check',
    {
      _meta: {ui: {visibility: ['app']}},
      annotations: {destructiveHint: false, openWorldHint: true, readOnlyHint: true},
      inputSchema: {},
      title: 'Check Code Viewer updates',
    },
    async () => {
      try {
        return {content: [], structuredContent: {...(await updates.check())}}
      } catch {
        return {content: [], isError: true, structuredContent: {code: 'update-check-failed'}}
      }
    },
  )
  server.registerTool(
    'code.update-install',
    {
      _meta: {ui: {visibility: ['app']}},
      annotations: {
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
        readOnlyHint: false,
      },
      inputSchema: {version: versionSchema},
      title: 'Install Code Viewer update',
    },
    async ({version}) => {
      try {
        return {content: [], structuredContent: {...(await updates.install(version))}}
      } catch (error) {
        const parsed = pluginUpdateErrorSchema.safeParse(error)
        const code = parsed.success ? parsed.data.code : 'update-install-failed'
        return {content: [], isError: true, structuredContent: {code}}
      }
    },
  )
}
