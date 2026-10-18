import assert from 'node:assert/strict'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {join, resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

/**
 * Runs the installed MCP server and navigation worker without repository runtime dependencies.
 * @param {import('./types.js').RuntimeOptions} options
 * @returns {Promise<import('./types.js').RuntimeResult>}
 */
export const verifyRuntime = async ({packageRoot, root, installed, packed, home}) => {
  const require = createRequire(join(packageRoot, 'package.json'))
  /** @type {typeof import('../../../packages/codex-code-viewer/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js')} */
  const {Client} = await import(
    pathToFileURL(require.resolve('@modelcontextprotocol/sdk/client/index.js')).href
  )
  /** @type {typeof import('../../../packages/codex-code-viewer/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js')} */
  const {StdioClientTransport} = await import(
    pathToFileURL(require.resolve('@modelcontextprotocol/sdk/client/stdio.js')).href
  )
  const project = join(root, 'project')
  await mkdir(join(project, '.git'), {recursive: true})
  await writeFile(join(project, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
  await writeFile(join(project, 'helper.ts'), 'export const greet = () => 1\n')
  await writeFile(join(project, 'caller.ts'), "import {greet} from './helper'\ngreet()\n")
  const client = new Client({name: 'npm tarball verification', version: '1.0.0'})
  const plugin = JSON.parse(await readFile(join(installed, '.codex-plugin/plugin.json'), 'utf8'))
  const config = JSON.parse(await readFile(resolve(installed, plugin.mcpServers), 'utf8'))
  const server = config.mcpServers['codex-code-viewer']
  assert.equal(server.command, 'node')
  const transport = new StdioClientTransport({
    args: server.args,
    command: process.execPath,
    cwd: resolve(installed, server.cwd),
    env: {CODEX_HOME: home, NODE_PATH: '', PATH: join(root, 'no-external-tools')},
    stderr: 'pipe',
  })
  try {
    let serverErrors = ''
    transport.stderr?.on('data', (chunk) => {
      serverErrors += chunk
    })
    await client.connect(transport)
    const tools = await client.listTools()
    assert.ok(tools.tools.some((tool) => tool.name === 'code.panel'))
    const resources = await client.listResources()
    const viewer = resources.resources.find((resource) =>
      resource.uri.startsWith('ui://codex-code-viewer/app-'),
    )
    assert.ok(viewer)
    const resource = await client.readResource({uri: viewer.uri})
    assert.ok('text' in resource.contents[0])
    assert.equal(resource.contents[0].text, await readFile(join(packed, 'dist/app.html'), 'utf8'))
    const opened = await client.callTool({
      arguments: {path: join(project, 'helper.ts')},
      name: 'code.open',
    })
    assert.ok(!opened.isError, JSON.stringify(opened))
    const session = opened.structuredContent
    assert.ok(
      session &&
        typeof session === 'object' &&
        'session' in session &&
        'document' in session &&
        session.document &&
        typeof session.document === 'object' &&
        'revision' in session.document,
    )
    const navigation = await client.callTool({
      arguments: {
        navigation: 'definition',
        offset: 13,
        path: 'helper.ts',
        revision: session.document.revision,
        session: session.session,
        stream: true,
      },
      name: 'code.navigate',
    })
    assert.ok(!navigation.isError, JSON.stringify(navigation))
    assert.ok(
      navigation.structuredContent &&
        typeof navigation.structuredContent === 'object' &&
        'url' in navigation.structuredContent &&
        typeof navigation.structuredContent.url === 'string',
    )
    const stream = await fetch(navigation.structuredContent.url)
    const messages = (await stream.text())
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    assert.deepEqual(messages.at(-1), {done: true})
    /** @type {import('./types.js').NavigationLocation[]} */
    const locations = messages.slice(0, -1).flatMap((message) => message.locations)
    assert.equal(
      locations.filter((location) => location.path === 'caller.ts').length,
      2,
      JSON.stringify(messages),
    )
    return {
      navigation: locations,
      resources: resources.resources.map((resource) => resource.uri),
      serverStderr: serverErrors,
      tools: tools.tools.map((tool) => tool.name),
    }
  } finally {
    await client.close()
  }
}
