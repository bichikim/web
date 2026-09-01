import {type ChildProcessWithoutNullStreams, execFile, spawn} from 'node:child_process'
import {rm} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import {expect, test} from '@playwright/test'

const execFileAsync = promisify(execFile)
const FIXTURE_URL = new URL('./fixtures/remote-server-functions/', import.meta.url)
const FIXTURE_DIRECTORY = fileURLToPath(FIXTURE_URL)
const VITE_EXECUTABLE = fileURLToPath(new URL('../node_modules/.bin/vite', import.meta.url))
const SSR_ORIGIN = 'http://127.0.0.1:45173'
const SSG_ORIGIN = 'http://127.0.0.1:1420'
const SERVER_VALUE = 'response from the running SSR server'

interface RunningServer {
  readonly process: ChildProcessWithoutNullStreams
  readonly readLogs: () => string
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
  environment = {},
): RunningServer => {
  const childProcess = spawn(command, arguments_, {
    cwd: FIXTURE_DIRECTORY,
    env: {...process.env, ...environment},
    stdio: 'pipe',
  })
  let logs = ''
  childProcess.stdout.on('data', (chunk: Buffer) => {
    logs += chunk.toString()
  })
  childProcess.stderr.on('data', (chunk: Buffer) => {
    logs += chunk.toString()
  })

  return {process: childProcess, readLogs: () => logs}
}

const waitForServer = async (
  server: RunningServer,
  origin: string,
  attemptsRemaining = 100,
): Promise<void> => {
  if (server.process.exitCode !== null) {
    throw new Error(`Server exited before becoming ready.\n${server.readLogs()}`)
  }

  try {
    const response = await fetch(origin)

    if (response.ok) {
      return
    }
  } catch {
    // A refused connection is expected while the process binds its port.
  }

  if (attemptsRemaining === 0) {
    throw new Error(`Server did not become ready.\n${server.readLogs()}`)
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 100)
  })
  return waitForServer(server, origin, attemptsRemaining - 1)
}

const stopServer = async (server: RunningServer | undefined): Promise<void> => {
  if (server === undefined || server.process.exitCode !== null) {
    return
  }

  server.process.kill('SIGTERM')
  await new Promise<void>((resolve) => {
    server.process.once('exit', () => resolve())
  })
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

    ssrServer = startServer(process.execPath, ['.output/ssr/server/index.mjs'], {
      HOST: '127.0.0.1',
      POMO_E2E_SERVER_VALUE: SERVER_VALUE,
      PORT: '45173',
    })
    ssgServer = startServer(VITE_EXECUTABLE, [
      'preview',
      '--config',
      'preview.config.ts',
      '--host',
      '127.0.0.1',
      '--port',
      '1420',
      '--outDir',
      '.output/ssg/public',
    ])

    await Promise.all([waitForServer(ssrServer, SSR_ORIGIN), waitForServer(ssgServer, SSG_ORIGIN)])
  })

  test.afterAll(async () => {
    await Promise.all([stopServer(ssgServer), stopServer(ssrServer)])
  })

  test('should call the running SSR server from the built SSG client', async ({page}) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url() === `${SSR_ORIGIN}/_server` && response.request().method() === 'POST',
    )

    const pageResponse = await page.goto(SSG_ORIGIN)
    const callButton = page.getByRole('button', {name: 'Call remote server function'})
    await expect(callButton).toBeVisible()
    await callButton.click()
    const serverResponse = await responsePromise

    expect(pageResponse?.ok()).toBe(true)
    expect(serverResponse.status()).toBe(200)
    expect(serverResponse.headers()['access-control-allow-origin']).toBe(SSG_ORIGIN)
    await expect(page.getByRole('status')).toHaveText(SERVER_VALUE)
  })
})
