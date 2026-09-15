import {type ChildProcessWithoutNullStreams, execFile, spawn} from 'node:child_process'
import {once} from 'node:events'
import {rm} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {promisify, stripVTControlCharacters} from 'node:util'
import {expect, test} from '@playwright/test'

const execFileAsync = promisify(execFile)
const FIXTURE_URL = new URL('../fixtures/remote-server-functions/', import.meta.url)
const FIXTURE_DIRECTORY = fileURLToPath(FIXTURE_URL)
const VITE_EXECUTABLE = fileURLToPath(new URL('../../node_modules/.bin/vite', import.meta.url))
const SSR_ORIGIN = 'http://127.0.0.1:45173'
const SSG_ORIGIN = 'http://127.0.0.1:1420'
const PREVIEW_ORIGIN = 'http://127.0.0.1:45174'
const SERVER_VALUE = 'response from the running SSR server'

interface RunningServer {
  readonly process: ChildProcessWithoutNullStreams
  readonly ready: Promise<void>
}

const buildFixture = async (buildTarget: 'ssg' | 'ssr'): Promise<void> => {
  await execFileAsync(VITE_EXECUTABLE, ['build'], {
    cwd: FIXTURE_DIRECTORY,
    env: {...process.env, POMO_E2E_BUILD_TARGET: buildTarget},
  })
}

const resetFixtureBuild = async (): Promise<void> => {
  await Promise.all(
    ['.nitro', '.output', 'node_modules'].map((directory) =>
      rm(fileURLToPath(new URL(directory, FIXTURE_URL)), {force: true, recursive: true}),
    ),
  )
}

const startServer = (
  command: string,
  arguments_: ReadonlyArray<string>,
  readyPattern: RegExp,
  environment = {},
): RunningServer => {
  const childProcess = spawn(command, arguments_, {
    cwd: FIXTURE_DIRECTORY,
    env: {...process.env, TEST: '', ...environment},
    stdio: 'pipe',
  })
  let logs = ''
  const deadline = AbortSignal.timeout(10_000)
  const ready = Promise.withResolvers<void>()
  const onExit = (code: number | null, signal: NodeJS.Signals | null) =>
    ready.reject(new Error(`Server exited before readiness (${code ?? signal}).\n${logs}`))
  const onAbort = () => ready.reject(new Error(`Server readiness timed out.\n${logs}`))
  const capture = (chunk: Buffer) => {
    logs += stripVTControlCharacters(chunk.toString())
    if (readyPattern.test(logs)) {
      ready.resolve()
    }
  }
  childProcess.stdout.on('data', capture)
  childProcess.stderr.on('data', capture)
  childProcess.once('error', ready.reject)
  childProcess.once('exit', onExit)
  deadline.addEventListener('abort', onAbort, {once: true})

  return {
    process: childProcess,
    ready: ready.promise.finally(() => {
      childProcess.stdout.off('data', capture)
      childProcess.stderr.off('data', capture)
      childProcess.off('exit', onExit)
      deadline.removeEventListener('abort', onAbort)
    }),
  }
}

const stopServer = async (server: RunningServer | undefined): Promise<void> => {
  if (
    server === undefined ||
    server.process.exitCode !== null ||
    server.process.signalCode !== null
  ) {
    return
  }

  const exited = once(server.process, 'exit', {signal: AbortSignal.timeout(5_000)})
  server.process.kill('SIGTERM')
  try {
    await exited
  } catch (error) {
    server.process.kill('SIGKILL')
    throw error
  }
}

test.describe('remote SolidStart server functions', () => {
  test.skip(({browserName}) => browserName !== 'chromium')
  test.describe.configure({mode: 'serial', timeout: 60_000})

  let ssrServer: RunningServer | undefined
  let ssgServer: RunningServer | undefined

  test.beforeAll(async () => {
    await resetFixtureBuild()
    await buildFixture('ssr')
    await buildFixture('ssg')

    ssrServer = startServer(
      process.execPath,
      ['.output/ssr/server/index.mjs'],
      /Listening on:\s+http:\/\/127\.0\.0\.1:45173\//u,
      {
        HOST: '127.0.0.1',
        POMO_E2E_SERVER_VALUE: SERVER_VALUE,
        PORT: '45173',
      },
    )
    ssgServer = startServer(
      VITE_EXECUTABLE,
      [
        'preview',
        '--config',
        'preview.config.ts',
        '--host',
        '127.0.0.1',
        '--port',
        '45174',
        '--strictPort',
        '--outDir',
        '.output/ssg/public',
      ],
      /Local:\s+http:\/\/127\.0\.0\.1:45174\//u,
    )

    await Promise.all([ssrServer.ready, ssgServer.ready])
  })

  test.afterAll(async () => {
    await Promise.all([stopServer(ssgServer), stopServer(ssrServer)])
  })

  test('should call the running SSR server from the built SSG client', async ({page}) => {
    // Forward real static files without occupying the desktop port or intercepting SSR requests.
    await page.route(`${SSG_ORIGIN}/**`, async (route) => {
      const url = new URL(route.request().url())
      await route.continue({url: `${PREVIEW_ORIGIN}${url.pathname}${url.search}`})
    })

    const pageResponse = await page.goto(SSG_ORIGIN)
    await expect(page).toHaveURL(`${SSG_ORIGIN}/`)
    const callButton = page.getByRole('button', {name: 'Call remote server function'})
    await expect(callButton).toBeVisible()
    const [serverResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url() === `${SSR_ORIGIN}/_server` && response.request().method() === 'POST',
      ),
      callButton.click(),
    ])

    expect(pageResponse?.ok()).toBe(true)
    expect(serverResponse.status()).toBe(200)
    expect(serverResponse.request().headers().origin).toBe(SSG_ORIGIN)
    expect(serverResponse.headers()['access-control-allow-origin']).toBe(SSG_ORIGIN)
    await expect(page.getByRole('status')).toHaveText(SERVER_VALUE)
  })
})
