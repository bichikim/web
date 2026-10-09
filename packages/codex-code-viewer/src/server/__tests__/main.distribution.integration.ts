import {copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js'
import {expect, it} from 'vitest'
import {navigationSchema, sessionSchema} from '../../shared/contracts'

it('should navigate Rust from the isolated distribution using Node and its embedded analyzer', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-distribution-')))
  const distribution = join(root, 'plugin/dist')
  const project = join(root, 'project')
  const host = `${process.platform}-${process.arch}`
  const executable = process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer'
  mkdirSync(join(distribution, 'rust', host), {recursive: true})
  mkdirSync(join(project, '.git'), {recursive: true})
  const output = new URL('../../../dist/plugin/dist/', import.meta.url)
  for (const file of ['server.js', 'app.html', `rust/${host}/${executable}`]) {
    copyFileSync(fileURLToPath(new URL(file, output)), join(distribution, file))
  }
  const main = 'mod helper;\nfn main() { helper::answer(); }\n'
  writeFileSync(join(project, 'main.rs'), main)
  writeFileSync(join(project, 'helper.rs'), 'pub fn answer() -> i32 { 42 }\n')
  const client = new Client({name: 'Distribution test', version: '1.0.0'})
  const transport = new StdioClientTransport({
    args: [join(distribution, 'server.js')],
    command: process.execPath,
    cwd: root,
    env: {
      CARGO: join(root, 'missing-cargo'),
      PATH: join(root, 'missing-tools'),
      RUST_ANALYZER_BINARY: '',
      RUSTC: join(root, 'missing-rustc'),
    },
    stderr: 'pipe',
  })
  try {
    await client.connect(transport)
    const opened = await client.callTool({
      arguments: {path: join(project, 'main.rs')},
      name: 'code.open',
    })
    const session = sessionSchema.parse(opened.structuredContent)
    const result = await client.callTool({
      arguments: {
        navigation: 'definition',
        offset: main.indexOf('answer'),
        path: 'main.rs',
        revision: session.document.revision,
        session: session.session,
      },
      name: 'code.navigate',
    })
    expect(result.isError).not.toBe(true)
    expect(navigationSchema.parse(result.structuredContent)).toEqual({
      locations: [{column: 8, line: 1, path: 'helper.rs'}],
    })
  } finally {
    await client.close()
    rmSync(root, {force: true, recursive: true})
  }
})
