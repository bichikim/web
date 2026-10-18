import {chmod, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {unzipSync} from 'fflate'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js'
import {expect, it} from 'vitest'
import manifest from '../../../package.json'
import {navigationSchema, sessionSchema} from '../../shared/contracts'

it('should open, navigate, read, and reject outside files from the isolated Claude bundle', async () => {
  const root = await mkdtemp(join(tmpdir(), 'claude-distribution-'))
  const distribution = join(root, 'extension')
  const project = join(root, 'project')
  const archive = fileURLToPath(
    new URL(
      `../../../dist/code-viewer-${manifest.version}-${process.platform}-${process.arch}.mcpb`,
      import.meta.url,
    ),
  )
  const entries = unzipSync(await readFile(archive))
  await Promise.all(
    Object.entries(entries).map(async ([name, bytes]) => {
      if (!name.endsWith('/')) {
        const path = join(distribution, name)
        await mkdir(dirname(path), {recursive: true})
        await writeFile(path, bytes)
        if (name.endsWith('/rust-analyzer')) {
          await chmod(path, 0o755)
        }
      }
    }),
  )
  await mkdir(join(project, '.git'), {recursive: true})
  await writeFile(join(project, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
  const source = "import {answer} from './helper'\nanswer()\n"
  await writeFile(join(project, 'main.ts'), source)
  await writeFile(join(project, 'helper.ts'), 'export const answer = () => 42\n')
  await writeFile(join(root, 'outside.ts'), 'outside workspace')
  const client = new Client({name: 'Claude distribution test', version: '1.0.0'})
  try {
    await client.connect(
      new StdioClientTransport({
        args: [join(distribution, 'dist/claude.js'), project],
        command: process.execPath,
        cwd: root,
        env: {PATH: join(root, 'missing-tools')},
        stderr: 'pipe',
      }),
    )
    const {tools} = await client.listTools()
    expect(tools.map(({name}) => name)).not.toContain('code.file')
    const entry = tools.find(({name}) => name === 'code.open')?._meta?.ui
    const resource = await client.readResource({uri: (entry as {resourceUri: string}).resourceUri})
    expect(resource.contents[0]).toMatchObject({
      text: expect.stringContaining('data-host="standard"'),
    })
    const opened = await client.callTool({
      arguments: {path: join(project, 'main.ts')},
      name: 'code.open',
    })
    const session = sessionSchema.parse(opened.structuredContent)
    const navigation = await client.callTool({
      arguments: {
        navigation: 'definition',
        offset: source.lastIndexOf('answer'),
        path: 'main.ts',
        revision: session.document.revision,
        session: session.session,
      },
      name: 'code.navigate',
    })
    expect(navigationSchema.parse(navigation.structuredContent).locations).toContainEqual(
      expect.objectContaining({line: 1, path: 'helper.ts'}),
    )
    const context = await client.callTool({arguments: {path: 'helper.ts'}, name: 'code.context'})
    expect(context.content).toEqual([
      {text: expect.stringContaining('export const answer'), type: 'text'},
    ])
    const draft = 'unsaved bundle attachment'
    await client.callTool({
      arguments: {content: [draft], session: session.session},
      name: 'code.stage-context',
    })
    expect(
      await client.callTool({arguments: {session: session.session}, name: 'code.attachments'}),
    ).toMatchObject({content: [{text: draft, type: 'text'}]})
    expect(
      await client.callTool({arguments: {path: join(root, 'outside.ts')}, name: 'code.open'}),
    ).toMatchObject({isError: true})
  } finally {
    await client.close()
    await rm(root, {force: true, recursive: true})
  }
})
