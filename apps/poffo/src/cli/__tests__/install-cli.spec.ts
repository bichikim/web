/** @vitest-environment node */
import {afterEach, expect, test, vi} from 'vitest'
import {mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {installCli} from '../install-cli'

afterEach(() => vi.unstubAllEnvs())

test('should register the packaged executable idempotently and preserve an existing unrelated command', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'poffo-cli-'))
  vi.stubEnv('POFFO_CLI_EXECUTABLE', join(directory, 'Poffo App', 'poffo-cli'))
  try {
    const first = await installCli(directory)
    expect(await installCli(directory)).toEqual(first)
    if (process.platform !== 'win32') {
      expect(await readlink(first.path)).toBe(process.env.POFFO_CLI_EXECUTABLE)
    }
    await rm(first.path)
    await writeFile(first.path, 'another command')
    await expect(installCli(directory)).rejects.toThrow('command-exists')
    expect(await readFile(first.path, 'utf8')).toBe('another command')
  } finally {
    await rm(directory, {force: true, recursive: true})
  }
})

test.skipIf(process.platform === 'win32')(
  'should recognize the same executable through another parent symlink',
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'poffo-cli-'))
    const app = join(root, 'Poffo App')
    await mkdir(app)
    await writeFile(join(app, 'poffo-cli'), 'launcher')
    await symlink(app, join(root, 'Alias'))
    try {
      vi.stubEnv('POFFO_CLI_EXECUTABLE', join(app, 'poffo-cli'))
      const installed = await installCli(join(root, 'bin'))
      vi.stubEnv('POFFO_CLI_EXECUTABLE', join(root, 'Alias', 'poffo-cli'))
      expect(await installCli(join(root, 'bin'))).toEqual(installed)
    } finally {
      await rm(root, {force: true, recursive: true})
    }
  },
)
