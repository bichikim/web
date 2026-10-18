import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {createServer} from '../server/create-server'
import {createClipboard} from '../server/create-clipboard'
import {createBrowserServer} from './create-browser-server'
import type {ComposerAttachment} from './create-composer-attachment'
import manifest from '../../package.json'

export interface BrowserWorkspaceOptions {
  readonly appHtml: string
  readonly html: string
  readonly clipboardEnabled: boolean
  readonly composer?: ComposerAttachment
}
export interface BrowserWorkspace {
  readonly browser: Awaited<ReturnType<typeof createBrowserServer>>
  readonly client: Client
  readonly close: () => Promise<void>
}

/** Owns one workspace's backend, authenticated Browser page and retained session. */
export const createBrowserWorkspace = async (
  root: string,
  options: BrowserWorkspaceOptions,
): Promise<BrowserWorkspace> => {
  const backend = createServer(options.appHtml, {
    integration: 'standard',
    workspaceRoot: root,
    ...(options.clipboardEnabled ? {clipboard: createClipboard()} : {}),
  })
  const client = new Client({name: 'Code Viewer Browser', version: manifest.version})
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()
  try {
    await backend.server.connect(serverTransport)
    await client.connect(clientTransport)
    const browser = await createBrowserServer({...options, client})
    return {
      browser,
      client,
      close: async (): Promise<void> => {
        await browser.close()
        await client.close()
        await backend.dispose()
      },
    }
  } catch (error) {
    await client.close()
    await backend.dispose()
    throw error
  }
}
