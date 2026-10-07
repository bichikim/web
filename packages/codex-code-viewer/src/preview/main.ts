import {AppBridge, PostMessageTransport} from '@modelcontextprotocol/ext-apps/app-bridge'
import {McpUiHostContextSchema} from '@modelcontextprotocol/ext-apps'
import {CallToolResultSchema, type ContentBlock} from '@modelcontextprotocol/sdk/types.js'

const frame = document.querySelector('iframe')
if (frame === null || frame.contentWindow === null) {
  throw new Error('Missing Code Viewer frame.')
}
const bridge = new AppBridge(
  null,
  {name: 'Code Viewer Preview', version: '0.1.1'},
  {experimental: {'openai/modelContext': {}}, serverTools: {}, updateModelContext: {}},
)
const selection = document.querySelector<HTMLSelectElement>('select')
const count = document.querySelector('output')
const contextList = document.querySelector('ul')
let modelContext: {updateId: string; content: ContentBlock[]} | null = null
const preference = globalThis.matchMedia('(prefers-color-scheme: dark)')
const updateAppearance = (): void => {
  const selected = selection?.value
  const theme =
    selected === 'light' || selected === 'dark' ? selected : preference.matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  const styles = getComputedStyle(document.documentElement)
  bridge.setHostContext(
    McpUiHostContextSchema.parse({
      'openai/modelContext': modelContext,
      styles: {
        variables: {
          '--border-radius-full': '9999px',
          '--border-radius-lg': '16px',
          '--border-radius-md': '12px',
          '--border-radius-xl': '20px',
          '--color-background-primary': styles.getPropertyValue('--viewer-background').trim(),
          '--color-background-secondary': styles.getPropertyValue('--viewer-surface').trim(),
          '--color-border-primary': styles.getPropertyValue('--viewer-border').trim(),
          '--color-text-primary': styles.getPropertyValue('--viewer-foreground').trim(),
          '--color-text-secondary': styles.getPropertyValue('--viewer-muted').trim(),
          '--shadow-md': styles.getPropertyValue('--viewer-panel-shadow').trim(),
          '--shadow-sm': styles.getPropertyValue('--viewer-control-shadow').trim(),
        },
      },
      theme,
    }),
  )
}
selection?.addEventListener('change', updateAppearance)
preference.addEventListener('change', updateAppearance)
const request = async (name: string, arguments_: Record<string, unknown>) => {
  const response = await fetch('./tool', {
    body: JSON.stringify({arguments: arguments_, name}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Preview request failed: ${response.status}`)
  }
  return CallToolResultSchema.parse(await response.json())
}
bridge.oncalltool = async (input) => request(input.name, input.arguments ?? {})
bridge.onupdatemodelcontext = async (input) => {
  modelContext = {content: input.content ?? [], updateId: crypto.randomUUID()}
  if (count !== null) {
    count.textContent = String(modelContext.content.length)
  }
  contextList?.replaceChildren(
    ...modelContext.content.flatMap((entry) => {
      if (entry.type !== 'text') {
        return []
      }
      const item = document.createElement('li')
      item.textContent = entry.text
      return [item]
    }),
  )
  updateAppearance()
  return {_meta: {'openai/modelContext': {updateId: modelContext.updateId}}}
}
document.querySelector('button')?.addEventListener('click', () => {
  modelContext = null
  contextList?.replaceChildren()
  if (count !== null) {
    count.textContent = '0'
  }
  updateAppearance()
})
bridge.oninitialized = async () => {
  const response = await fetch('./initial')
  const input: unknown = await response.json()
  const result = CallToolResultSchema.parse(input)
  await bridge.sendToolInput({arguments: result.structuredContent})
  await bridge.sendToolResult(result)
}
await bridge.connect(new PostMessageTransport(frame.contentWindow, frame.contentWindow))
updateAppearance()
frame.src = './app'
