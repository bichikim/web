import {AppBridge, PostMessageTransport} from '@modelcontextprotocol/ext-apps/app-bridge'
import {
  CallToolResultSchema,
  type Notification,
  type Request,
  type Result,
} from '@modelcontextprotocol/sdk/types.js'
import {z} from 'zod'
import type {Protocol} from '@modelcontextprotocol/sdk/shared/protocol.js'
import manifest from '../../package.json'
import {readJsonStream} from '../viewer/read-json-stream'

const frame = document.querySelector('iframe')
if (frame === null || frame.contentWindow === null) {
  throw new Error('Missing Code Viewer frame.')
}
const token = new URLSearchParams(location.hash.slice(1)).get('token')
if (token === null) {
  throw new Error('Open this viewer using the code.browser MCP tool.')
}
const request = async (path: string, input?: unknown, signal?: AbortSignal) => {
  const response = await fetch(path, {
    body: input === undefined ? undefined : JSON.stringify(input),
    headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    method: input === undefined ? 'GET' : 'POST',
    signal,
  })
  if (!response.ok) {
    throw new Error(`Code Viewer request failed: ${response.status}`)
  }
  return CallToolResultSchema.parse(await response.json())
}
const bridge = new AppBridge(
  null,
  {name: 'Code Viewer Browser', version: manifest.version},
  {
    experimental: {'winter-love/file-viewer/location': {version: 1}},
    serverTools: {},
    updateModelContext: {},
  },
)
const protocol = bridge as unknown as Protocol<Request, Notification, Result>
protocol.setRequestHandler(
  z.object({
    method: z.literal('winter-love/file-viewer/location'),
    params: z.object({path: z.string(), workspace: z.string()}),
  }),
  async ({params}, extra) => {
    const response = await fetch('/location', {
      body: JSON.stringify(params),
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      method: 'POST',
      signal: extra.signal,
    })
    if (!response.ok) {
      throw new Error(`Code Viewer location failed: ${response.status}`)
    }
    return {}
  },
)
bridge.oncalltool = (input, extra) =>
  request('/tool', {arguments: input.arguments ?? {}, name: input.name}, extra.signal)
// Attachments are committed by code.stage-context before this notification.
bridge.onupdatemodelcontext = async () => ({})
const controller = new AbortController()
window.addEventListener('pagehide', () => controller.abort(), {once: true})
bridge.oninitialized = () => {
  readJsonStream({
    headers: {Authorization: `Bearer ${token}`},
    receive: async (result) => {
      await bridge.sendToolInput({arguments: result.structuredContent})
      await bridge.sendToolResult(result)
    },
    schema: CallToolResultSchema,
    signal: controller.signal,
    url: '/events',
  }).catch((error: unknown) => {
    if (!controller.signal.aborted) {
      console.error('Code Viewer navigation connection failed.', error)
    }
  })
}
const preference = matchMedia('(prefers-color-scheme: dark)')
const updateAppearance = (): void => {
  bridge.setHostContext({locale: navigator.language, theme: preference.matches ? 'dark' : 'light'})
}
preference.addEventListener('change', updateAppearance)
await bridge.connect(new PostMessageTransport(frame.contentWindow, frame.contentWindow))
updateAppearance()
frame.src = '/app'
