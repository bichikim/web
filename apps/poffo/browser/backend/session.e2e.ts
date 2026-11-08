import {expect, test} from 'playwright/test'
import {createDemoDocument} from '@winter-love/puppet/player'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {PNG} from 'pngjs'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js'
import {cliPath, startHost} from './host'
import {sendCommand} from '../../src/cli/connection'

test('should share edits, undo, MCP, completed-frame renders, and native save/reload', async ({
  page,
}) => {
  const workspace = await mkdtemp(join(tmpdir(), 'poffo-e2e-'))
  let host: Awaited<ReturnType<typeof startHost>> | undefined
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await writeFile(join(workspace, 'source.json'), JSON.stringify(createDemoDocument()))
    host = await startHost(workspace, 'source.json')
    const {connection} = host
    const call = (operation: string, input?: unknown) =>
      sendCommand(connection, {input, operation, requestId: randomUUID()})
    await page.goto(`${connection.url}/editor#poffo-token=${connection.token}`)
    const opacity = page.getByRole('spinbutton', {exact: true, name: '파트 불투명도'})
    await expect(opacity).toBeVisible()
    const patch = [{op: 'add', path: '/parts/0/properties', value: {opacity: 0.5}}]
    const preview = await call('edit.preview', {expectedRevision: 0, patch})
    expect(preview.ok).toBe(true)
    if (!preview.ok) {
      throw new Error('preview failed')
    }
    expect(await call('edit.apply', {...Object(preview.value), patch})).toMatchObject({
      ok: true,
      revision: 1,
    })
    await expect(opacity).toHaveValue('0.5')
    const committed = page.waitForResponse((response) => {
      if (!response.url().endsWith('/api/command')) {
        return false
      }
      return response.request().postDataJSON().input?.type === 'commit'
    })
    await opacity.fill('0.7')
    await opacity.press('Tab')
    expect((await committed).ok()).toBe(true)
    const read = await call('document.read')
    expect(read).toMatchObject({ok: true, value: {undoCount: 2}})
    if (!read.ok) {
      throw new Error('read failed')
    }
    const changed = JSON.stringify(read.value)
    expect(changed).toContain('"opacity":0.7')
    const undone = await call('history.undo', {expectedRevision: read.revision})
    expect(undone.ok).toBe(true)
    await expect(opacity).toHaveValue('0.5')
    if (!undone.ok) {
      throw new Error('undo failed')
    }
    const redone = await call('history.redo', {expectedRevision: undone.revision})
    expect(redone.ok).toBe(true)
    await expect(opacity).toHaveValue('0.7')
    if (!redone.ok) {
      throw new Error('redo failed')
    }
    const rendered = await call('view.render', {
      expectedRevision: redone.revision,
      path: 'neutral.png',
      size: 256,
    })
    expect(rendered).toMatchObject({
      ok: true,
      value: {height: 192, renderedRevision: redone.revision, width: 256},
    })
    const neutral = await readFile(join(workspace, 'neutral.png'))
    const pixels = PNG.sync.read(neutral)
    expect(pixels.data.some((alpha, index) => index % 4 === 3 && alpha > 0)).toBe(true)
    expect(
      await call('view.render', {
        expectedRevision: redone.revision,
        motionId: 'idle-deform',
        path: 'motion.png',
        size: 256,
        time: 1,
      }),
    ).toMatchObject({ok: true})
    expect((await readFile(join(workspace, 'motion.png'))).equals(neutral)).toBe(false)
    expect(await call('status')).toMatchObject({ok: true, revision: redone.revision})
    const client = new Client({name: 'poffo-e2e', version: '1'})
    await client.connect(
      new StdioClientTransport({
        args: [cliPath, 'mcp', '--workspace', workspace],
        command: process.execPath,
        stderr: 'pipe',
      }),
    )
    try {
      expect((await client.listTools()).tools.map(({name}) => name)).toEqual([
        'poffo_operations',
        'poffo_call',
      ])
      expect(
        (await client.callTool({arguments: {operation: 'status'}, name: 'poffo_call'}))
          .structuredContent,
      ).toMatchObject({ok: true, revision: redone.revision, sessionId: connection.sessionId})
    } finally {
      await client.close()
    }
    expect(
      await call('document.save', {
        expectedRevision: redone.revision,
        format: 'poffo',
        path: 'final.poffo',
      }),
    ).toMatchObject({ok: true})
    await page.goto('about:blank')
    await host.close()
    host = await startHost(workspace, 'final.poffo')
    expect(
      await sendCommand(host.connection, {operation: 'document.read', requestId: randomUUID()}),
    ).toMatchObject({ok: true, value: {document: Object(read.value).document}})
    expect(errors).toEqual([])
  } finally {
    await host?.close()
    await rm(workspace, {force: true, recursive: true})
  }
})

test('should start development mode and execute/resume a production CLI recipe', async ({page}) => {
  const workspace = await mkdtemp(join(tmpdir(), 'poffo-dev-'))
  let host: Awaited<ReturnType<typeof startHost>> | undefined
  try {
    await writeFile(join(workspace, 'source.json'), JSON.stringify(createDemoDocument()))
    host = await startHost(workspace, 'source.json', 'dev')
    await page.goto(`${host.connection.url}/editor#poffo-token=${host.connection.token}`)
    await expect(page.getByRole('spinbutton', {exact: true, name: '파트 불투명도'})).toBeVisible()
    await writeFile(
      join(workspace, 'recipe.json'),
      JSON.stringify({
        input: 'source.json',
        output: {path: 'result.poffo'},
        steps: [
          {patch: [{op: 'add', path: '/framesPerSecond', value: 48}], type: 'patch'},
          {path: 'recipe.png', size: 256, type: 'render'},
        ],
        version: 1,
      }),
    )
    const execute = promisify(execFile)
    const run = await execute(
      process.execPath,
      [cliPath, 'recipe', 'recipe.json', '--workspace', workspace],
      {timeout: 30_000},
    )
    expect(JSON.parse(run.stdout)).toMatchObject({report: {complete: true, completed: 2}})
    const resumed = await execute(
      process.execPath,
      [cliPath, 'recipe', 'recipe.json', '--resume', '--workspace', workspace],
      {timeout: 30_000},
    )
    expect(JSON.parse(resumed.stdout).report).toEqual(JSON.parse(run.stdout).report)
    expect(PNG.sync.read(await readFile(join(workspace, 'recipe.png'))).width).toBe(256)
  } finally {
    await page.goto('about:blank')
    await host?.close()
    await rm(workspace, {force: true, recursive: true})
  }
})
