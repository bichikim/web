import {expect, test} from 'playwright/test'
import {copyFile, cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {createHash, randomUUID} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {PNG} from 'pngjs'
import {
  parseDocumentBlob,
  parseDocumentValue,
  type PuppetDocument,
} from '@winter-love/puppet/player'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js'
import {installedEnvironment, startInstalledHost} from './installed-host'
import {observeMotion} from './observe-motion'
import {sendCommand} from '../../src/cli/connection'

const executable = process.env.POFFO_INSTALLED_CLI
const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex')
const rigHash = ({motions: _motions, ...document}: PuppetDocument) => hash(JSON.stringify(document))
const command = promisify(execFile)

test('should author and reload a real character using the installed CLI, MCP and actual renderer', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(executable === undefined, 'Requires a built desktop runtime')
  const workspace = await mkdtemp(join(tmpdir(), 'Poffo character '))
  const output =
    process.env.POFFO_VALIDATION_OUTPUT === undefined
      ? testInfo.outputPath('artifacts')
      : join(process.env.POFFO_VALIDATION_OUTPUT, browserName)
  await mkdir(output, {recursive: true})
  let host: Awaited<ReturnType<typeof startInstalledHost>> | undefined
  let complete = false
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const execute = async (...args: ReadonlyArray<string>) => {
    try {
      return JSON.parse(
        (
          await command(executable!, [...args, '--workspace', workspace], {
            env: installedEnvironment(),
            maxBuffer: 4 * 1024 * 1024,
            timeout: 120_000,
          })
        ).stdout,
      )
    } catch (error) {
      if (error instanceof Error) {
        await writeFile(
          join(output, 'cli-failure.json'),
          JSON.stringify(
            {
              command: args,
              message: error.message,
              ...Object.fromEntries(
                ['code', 'signal', 'killed', 'stdout', 'stderr'].map((name) => [
                  name,
                  Reflect.get(error, name),
                ]),
              ),
            },
            null,
            2,
          ),
        )
      }
      throw error
    }
  }
  try {
    const source = await readFile(
      fileURLToPath(
        new URL('../../../../packages/puppet/examples/development-model.json', import.meta.url),
      ),
    )
    const original = parseDocumentValue(JSON.parse(source.toString()))
    if (!original.ok) {
      throw new Error('Character fixture is invalid')
    }
    await writeFile(join(workspace, 'source.json'), source)
    await copyFile(
      fileURLToPath(new URL('../../validation/character/recipe.json', import.meta.url)),
      join(workspace, 'recipe.json'),
    )
    const doctor = await execute('doctor')
    expect(doctor.packaged).toBe(true)
    expect(
      (await realpath(doctor.executable)).startsWith(await realpath(dirname(executable!))),
    ).toBe(true)
    const installed = await execute('install-cli', '--directory', join(workspace, 'bin'))
    const registered =
      process.platform === 'win32'
        ? await command(
            process.env.ComSpec ?? 'cmd.exe',
            ['/d', '/s', '/c', `""${installed.path}" doctor"`],
            {windowsVerbatimArguments: true},
          )
        : await command(installed.path, ['doctor'])
    expect(JSON.parse(registered.stdout).packaged).toBe(true)
    host = await startInstalledHost(executable!, workspace, 'source.json')
    const call = (operation: string, input?: unknown) =>
      sendCommand(host!.connection, {input, operation, requestId: randomUUID()})
    await page.goto(`${host.connection.url}/editor#poffo-token=${host.connection.token}`)
    await expect(page.getByLabel('파츠 122개', {exact: true})).toBeVisible()
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')
      if (gl === null) {
        throw new Error('WebGL2 is unavailable')
      }
      const extension = gl.getExtension('WEBGL_debug_renderer_info')
      const result = String(
        gl.getParameter(extension === null ? gl.RENDERER : extension.UNMASKED_RENDERER_WEBGL),
      )
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      return result
    })
    if (browserName === 'chromium') {
      expect(renderer).toContain('SwiftShader')
    }

    const run = await test.step('Run the seven-step character recipe through the shipped CLI', () =>
      execute('recipe', 'recipe.json'))
    expect(run.report).toMatchObject({complete: true, completed: 7})
    await expect(page.getByRole('button', {exact: true, name: 'CLI 검증 모션 추가'})).toBeVisible()
    expect(await call('status')).toMatchObject({
      ok: true,
      value: {motionCount: 7, partCount: 122, undoCount: 1},
    })
    const recipe = JSON.parse(await readFile(join(workspace, 'recipe.json'), 'utf8'))
    const images: Record<string, string> = {}
    await Promise.all(
      recipe.steps
        .filter((step: {type: string}) => step.type === 'render')
        .map(async (step: {path: string}) => {
          const bytes = await readFile(join(workspace, step.path))
          const image = PNG.sync.read(bytes)
          expect(image.height).toBe(1280)
          expect(image.width).toBeGreaterThan(700)
          expect(
            image.data.filter((alpha, index) => index % 4 === 3 && alpha > 0).length,
          ).toBeGreaterThan(10_000)
          images[step.path] = hash(image.data)
          await copyFile(join(workspace, step.path), join(output, step.path))
        }),
    )
    expect(new Set(Object.values(images)).size).toBe(6)
    const saved = await parseDocumentBlob({
      source: new Blob([Uint8Array.from(await readFile(join(workspace, 'model.poffo')))]),
    })
    if (!saved.ok) {
      throw new Error('Saved character could not be reopened')
    }
    expect(rigHash(saved.document)).toBe(rigHash(original.document))
    expect(saved.document.motions.slice(0, original.document.motions.length)).toEqual(
      original.document.motions,
    )
    const client = new Client({name: 'character-validation', version: '1'})
    await client.connect(
      new StdioClientTransport({
        args: ['mcp', '--workspace', workspace],
        command: executable!,
        stderr: 'pipe',
      }),
    )
    try {
      expect(
        (await client.callTool({arguments: {operation: 'status'}, name: 'poffo_call'}))
          .structuredContent,
      ).toMatchObject({
        ok: true,
        sessionId: host.connection.sessionId,
        value: {motionCount: 7, partCount: 122},
      })
    } finally {
      await client.close()
    }
    await page.getByRole('button', {exact: true, name: 'Viewer'}).click()
    await page.getByRole('button', {exact: true, name: '화면 맞춤'}).click()
    const picker = page.getByRole('button', {name: /^모션 선택 /u})
    await expect(picker).toBeEnabled()
    await picker.click()
    await page.getByRole('option', {exact: true, name: 'cli-verification'}).click()
    const times = await observeMotion(page)
    expect(Math.max(...times)).toBeGreaterThan(3.5)
    expect(Math.min(...times)).toBeLessThan(0.5)
    await page.screenshot({path: join(output, 'playback.png')})
    const status = await call('status')
    if (!status.ok) {
      throw new Error(status.error.message)
    }
    expect(
      await call('view.render', {
        expectedRevision: status.revision,
        path: 'before-reload.png',
        size: 1280,
      }),
    ).toMatchObject({ok: true})
    const baselineImage = PNG.sync.read(await readFile(join(workspace, 'before-reload.png')))
    const reloadBaseline = hash(baselineImage.data)
    await copyFile(join(workspace, 'before-reload.png'), join(output, 'before-reload.png'))
    await page.goto('about:blank')
    await host.close()
    host = await startInstalledHost(executable!, workspace, 'model.poffo')
    await page.goto(`${host.connection.url}/viewer#poffo-token=${host.connection.token}`)
    await expect(page.getByRole('button', {name: /^모션 선택 /u})).toBeEnabled()
    expect(
      await call('view.render', {expectedRevision: 0, path: 'reloaded.png', size: 1280}),
    ).toMatchObject({ok: true})
    const reloadedImage = PNG.sync.read(await readFile(join(workspace, 'reloaded.png')))
    const viewerParity = hash(reloadedImage.data) === reloadBaseline
    // SwiftShader is the strict numerical reference. Hardware WebKit retains raw RGB diagnostics.
    if (browserName === 'chromium') {
      expect(viewerParity).toBe(true)
    }
    expect(reloadedImage.data.filter((_value, index) => index % 4 === 3)).toEqual(
      baselineImage.data.filter((_value, index) => index % 4 === 3),
    )
    await copyFile(join(workspace, 'reloaded.png'), join(output, 'reloaded.png'))
    expect(hash(await readFile(join(workspace, 'source.json')))).toBe(hash(source))
    expect(errors).toEqual([])
    await Promise.all(
      ['model.poffo', 'recipe.json'].map((path) =>
        copyFile(join(workspace, path), join(output, path)),
      ),
    )
    await writeFile(
      join(output, 'report.json'),
      JSON.stringify(
        {
          browserName,
          doctor,
          errors,
          images,
          inputHash: hash(source),
          pixelParity: {
            editorToViewer: reloadBaseline === images['neutral.png'],
            viewerReload: viewerParity,
          },
          playback: {cycles: 2, observedFrames: times.length, times},
          recipe: run.report,
          reload: true,
          renderer,
          rigHash: rigHash(saved.document),
          sourcePreserved: true,
        },
        null,
        2,
      ),
    )
    complete = true
  } finally {
    await page.goto('about:blank').catch(() => undefined)
    await host?.close()
    if (!complete) {
      await cp(join(workspace, '.poffo/recipes'), join(output, 'recipes'), {
        preserveTimestamps: true,
        recursive: true,
      }).catch((error: unknown) =>
        console.error('Could not retain recipe failure evidence.', error),
      )
    }
    await rm(workspace, {force: true, recursive: true})
  }
})
