import {expect, test} from 'playwright/test'
import {copyFile, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {createHash, randomUUID} from 'node:crypto'
import {PNG} from 'pngjs'
import {startInstalledHost} from '../backend/installed-host'
import {sendCommand} from '../../src/cli/connection'
import {beginTrace, installTrace, readTrace} from './trace'
import {encodingControl} from './encoding-control'
import {encodeFramePng} from '../../src/backend/encode-frame-png'

const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex')

test('should preserve the captured frame while tracing pixel boundaries', async ({
  page,
  browser,
}, testInfo) => {
  const executable = process.env.POFFO_INSTALLED_CLI
  test.skip(executable === undefined, 'Requires an installed Poffo runtime')
  const workspace = await mkdtemp(join(tmpdir(), 'Poffo pixels '))
  const output = join(
    process.env.POFFO_VALIDATION_OUTPUT ?? testInfo.outputPath('artifacts'),
    'pixels',
  )
  await mkdir(output, {recursive: true})
  let host: Awaited<ReturnType<typeof startInstalledHost>> | undefined
  try {
    await page.clock.install({time: new Date('2026-01-01T00:00:00Z')})
    await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'))
    await installTrace(page)
    await copyFile(
      fileURLToPath(
        new URL('../../../../packages/puppet/examples/development-model.json', import.meta.url),
      ),
      join(workspace, 'source.json'),
    )
    host = await startInstalledHost(executable!, workspace, 'source.json')
    await page.goto(`${host.connection.url}/editor#poffo-token=${host.connection.token}`)
    await expect(page.getByLabel('파츠 122개', {exact: true})).toBeVisible()
    const capture = async (path: string) => {
      const result = await sendCommand(host!.connection, {
        input: {expectedRevision: 0, path, size: 1280},
        operation: 'view.render',
        requestId: randomUUID(),
      })
      expect(result.ok).toBe(true)
      const bytes = await readFile(join(workspace, path))
      await writeFile(join(output, path), bytes)
      return PNG.sync.read(bytes)
    }
    const baseline = await capture('baseline.png')
    await beginTrace(page)
    const observed = await capture('observed.png')
    expect(hash(observed.data)).toBe(hash(baseline.data))
    const installed = await readTrace(page)
    // Profiling every draw runs outside the command deadline; its final GPU bytes must
    // still equal the installed renderer before any intermediate result is accepted.
    const probe = await page.context().newPage()
    let dataUrl: string
    let captured: Awaited<ReturnType<typeof readTrace>>
    try {
      const selection = process.env.POFFO_PIXEL_STAGE
      await installTrace(
        probe,
        selection === 'all' ? 'all' : selection ? Number(selection) : undefined,
      )
      await probe.goto('http://127.0.0.1:4427/browser/pixels/index.html')
      await expect
        .poll(() => probe.evaluate(() => typeof Reflect.get(globalThis, 'poffoPixelRender')))
        .toBe('function')
      await beginTrace(probe)
      dataUrl = await probe.evaluate(async () => {
        const render = Reflect.get(globalThis, 'poffoPixelRender') as () => Promise<{
          dataUrl: string
        }>
        return (await render()).dataUrl
      })
      captured = await readTrace(probe)
    } finally {
      await probe.close()
    }
    const {pixels, stages, ...trace} = captured
    const raw = Uint8Array.from(pixels)
    expect(hash(raw)).toBe(hash(Uint8Array.from(installed.pixels)))
    const canonical = Buffer.from(dataUrl.split(',')[1]!, 'base64')
    expect(hash(canonical)).toBe(
      hash(encodeFramePng({height: observed.height, pixels: raw, width: observed.width})),
    )
    await writeFile(join(output, 'canonical.png'), canonical)
    await writeFile(join(output, 'drawing-buffer.rgba'), raw)
    await Promise.all(
      stages.map(async (stage) => {
        if (stage.pixels !== undefined) {
          await writeFile(join(output, `stage-${stage.index}.rgba`), Uint8Array.from(stage.pixels))
        }
      }),
    )
    const control = await encodingControl(page)
    expect(control.error).toBe(0)
    expect(control.pixels).toEqual(control.input)
    const encoded = Buffer.from(control.dataUrl.split(',')[1]!, 'base64')
    await writeFile(join(output, 'encoding-control.png'), encoded)
    await writeFile(
      join(output, 'report.json'),
      JSON.stringify(
        {
          architecture: process.arch,
          browser: browser.version(),
          control: {
            pngPixelHash: hash(PNG.sync.read(encoded).data),
            rawHash: hash(Uint8Array.from(control.pixels)),
          },
          drawingBufferHash: hash(raw),
          height: observed.height,
          nativePngPixelHash: hash(observed.data),
          platform: process.platform,
          pngPixelHash: hash(PNG.sync.read(canonical).data),
          stageSelection: process.env.POFFO_PIXEL_STAGE || 'none',
          width: observed.width,
          ...trace,
          stages: stages.map(({pixels: _pixels, ...stage}) => stage),
        },
        null,
        2,
      ),
    )
    expect(trace.error).toBe(0)
    expect(stages.every((stage) => stage.error === 0)).toBe(true)
  } finally {
    await page.goto('about:blank').catch(() => undefined)
    await host?.close()
    await rm(workspace, {force: true, recursive: true})
  }
})
