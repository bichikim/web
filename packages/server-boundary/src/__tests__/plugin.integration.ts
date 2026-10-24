import {execFile} from 'node:child_process'
import {access, appendFile, cp, mkdir, mkdtemp, rm} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {dirname, resolve} from 'node:path'
import {promisify} from 'node:util'
import {afterEach, beforeEach, expect, it} from 'vitest'

const packageDirectory = resolve(import.meta.dirname, '../..')
const require = createRequire(import.meta.url)
const viteCommand = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js')
const execute = promisify(execFile)
let directory: string | undefined

beforeEach(async () => {
  // Keep dependency resolution inside the package without changing the checked-in example.
  const temporaryDirectory = resolve(packageDirectory, '.temp')
  await mkdir(temporaryDirectory, {recursive: true})
  directory = await mkdtemp(resolve(temporaryDirectory, 'build-'))
  await cp(resolve(packageDirectory, 'example/src'), resolve(directory, 'src'), {recursive: true})
  await cp(
    resolve(packageDirectory, 'example/vite.config.ts'),
    resolve(directory, 'vite.config.ts'),
  )
})

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, {force: true, recursive: true})
    directory = undefined
  }
})

const buildExample = () =>
  execute(process.execPath, [viteCommand, 'build'], {
    cwd: directory,
    env: {...process.env, NO_COLOR: '1', NODE_ENV: 'production'},
    maxBuffer: 4 * 1024 * 1024,
    timeout: 90_000,
  })

it('should build SolidStart server function references without rejecting their server dependencies', async () => {
  await buildExample()
  await expect(access(resolve(directory!, '.output/server/index.mjs'))).resolves.toBeUndefined()
}, 120_000)

it('should fail the SolidStart build when the client directly imports a server module', async () => {
  await appendFile(
    resolve(directory!, 'src/entry-client.tsx'),
    '\nimport {message} from "./server/message";\nconsole.log(message);\n',
  )

  await expect(buildExample()).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringMatching(
      /Server directory module reached the client: .*src\/server\/message\.ts/u,
    ),
  })
}, 120_000)
