import {execFileSync} from 'node:child_process'
import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js'
import {expect, it} from 'vitest'
import {z} from 'zod'

it('should use the requested linked worktree and retain each workspace session and attachments', async () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'browser-worktree-')))
  const root = join(directory, 'project')
  const worktree = join(directory, 'worktree')
  const unrelated = join(directory, 'unrelated')
  const git = (...args: string[]) => execFileSync('git', args, {stdio: 'pipe'})
  git('init', root)
  writeFileSync(join(root, 'main.ts'), 'export const value = 1\n')
  git('-C', root, 'add', 'main.ts')
  git(
    '-C',
    root,
    '-c',
    'user.name=Viewer test',
    '-c',
    'user.email=viewer@example.invalid',
    'commit',
    '-m',
    'fixture',
  )
  git('-C', root, 'worktree', 'add', '--detach', worktree)
  git('init', unrelated)
  writeFileSync(join(worktree, 'main.ts'), 'export const value = 42\nexport const line = 2\n')
  const client = new Client({name: 'Worktree regression', version: '1.0.0'})
  const transport = new StdioClientTransport({
    args: [fileURLToPath(new URL('../../../dist/browser.js', import.meta.url)), root],
    command: process.execPath,
    cwd: root,
    stderr: 'pipe',
  })
  const location = z.object({session: z.string(), url: z.url(), workspace: z.string()})
  try {
    await client.connect(transport)
    const opened = await client.callTool({arguments: {workspace: worktree}, name: 'code.browser'})
    const current = location.parse(opened.structuredContent)
    expect(current.workspace).toBe(worktree)
    expect(
      await client.callTool({
        arguments: {column: 8, line: 2, path: join(worktree, 'main.ts'), workspace: worktree},
        name: 'code.browser',
      }),
    ).toMatchObject({
      structuredContent: {
        ...current,
        location: {column: 8, line: 2, path: 'main.ts'},
      },
    })
    const address = new URL(current.url)
    const headers = {
      Authorization: `Bearer ${new URLSearchParams(address.hash.slice(1)).get('token')}`,
      'Content-Type': 'application/json',
    }
    await fetch(new URL('/tool', address), {
      body: JSON.stringify({
        arguments: {content: ['WORKTREE_DRAFT'], session: current.session},
        name: 'code.stage-context',
      }),
      headers,
      method: 'POST',
    })
    expect(await client.callTool({arguments: {}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'WORKTREE_DRAFT', type: 'text'}],
    })
    expect(
      await client.callTool({arguments: {workspace: unrelated}, name: 'code.browser'}),
    ).toMatchObject({
      isError: true,
      structuredContent: {code: 'outside-workspace'},
    })
    expect(
      await client.callTool({
        arguments: {path: '../project/main.ts', workspace: worktree},
        name: 'code.browser',
      }),
    ).toMatchObject({isError: true})
    const original = location.parse(
      (await client.callTool({arguments: {workspace: root}, name: 'code.browser'}))
        .structuredContent,
    )
    expect(original.workspace).toBe(root)
    expect(original.url).not.toBe(current.url)
    expect(
      await client.callTool({arguments: {workspace: worktree}, name: 'code.browser'}),
    ).toMatchObject({structuredContent: current})
    expect(await client.callTool({arguments: {}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'WORKTREE_DRAFT', type: 'text'}],
    })
    expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
      structuredContent: {
        document: {
          location: {column: 8, line: 2, path: 'main.ts'},
          source: 'export const value = 42\nexport const line = 2\n',
        },
      },
    })
  } finally {
    await client.close()
    rmSync(directory, {force: true, recursive: true})
  }
})
